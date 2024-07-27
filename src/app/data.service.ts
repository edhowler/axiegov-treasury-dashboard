import { Injectable } from '@angular/core';
import { ethers } from 'ethers';
import { Observable, from, forkJoin, of, throwError } from 'rxjs';
import { map, mergeMap, catchError, retry, delay } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private rpcUrl = 'https://5y9q9ameya.execute-api.us-east-1.amazonaws.com/hackatonproxy/archive';
  private treasuryAddress = '0x245db945c485b68fdc429e4f7085a1761aa4d45d';
  private tokenAddressToSymbol: { [key: string]: { symbol: string, decimals: number } } = {
    '0xc99a6a985ed2cac1ef41640596c5a5f9f4e19ef5': { symbol: 'WETH', decimals: 18 },
    '0x97a9107c1793bc407d6f527b77e7fff4d812bece': { symbol: 'AXS', decimals: 18 },
    '0xa8754b9fa15fc18bb59458815510e40a12cd2014': { symbol: 'SLP', decimals: 0 }
  };
  constructor(private http: HttpClient) { }

  fetchTreasuryTransfers(startTimestamp: number, endTimestamp: number, apiKey: string, progressCallback: (progress: number) => void): Observable<any[]> {
    const provider = this.createProvider(apiKey);
    const paddedTreasuryAddress = '0x000000000000000000000000' + this.treasuryAddress.slice(2).toLowerCase();
    const maxBlocksPerRequest = 2000;
    const maxRetries = 5;

    return forkJoin([
      from(this.findClosestBlock(provider, startTimestamp)),
      from(this.findClosestBlock(provider, endTimestamp))
    ]).pipe(
      mergeMap(([startBlock, endBlock]) => {
        const fetchLogs = (fromBlock: number, toBlock: number): Observable<any[]> => {
          const params = [{
            fromBlock: this.toHex(fromBlock),
            toBlock: this.toHex(toBlock),
            topics: [
              '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
              null,
              paddedTreasuryAddress
            ]
          }];

          return from(provider.send('eth_getLogs', params)).pipe(
            catchError(error => {
              console.error(`Error fetching logs for blocks ${fromBlock}-${toBlock}:`, error);
              return throwError(() => error);
            }),
            retry({
              count: maxRetries,
              delay: (error, retryCount) => {
                const delayMs = Math.pow(2, retryCount) * 1000; // Exponential backoff
                console.log(`Retrying in ${delay}ms...`);
                return of(null).pipe(delay(delayMs));
              }
            }),
            mergeMap((logs: any[]) => {
              return forkJoin(
                logs.map((log: any, index: number) =>
                  from(this.parseTransferLog(log, provider)).pipe(
                    map(parsedLog => {
                      progressCallback(((fromBlock - startBlock + index + 1) / (endBlock - startBlock)) * 100);
                      return parsedLog;
                    }),
                    catchError(error => {
                      console.error('Error parsing log:', error);
                      return of(null);
                    })
                  )
                )
              );
            })
          );
        };

        const observables: Observable<any[]>[] = [];
        for (let currentBlock = startBlock; currentBlock <= endBlock; currentBlock += maxBlocksPerRequest) {
          const toBlock = Math.min(currentBlock + maxBlocksPerRequest - 1, endBlock);
          observables.push(fetchLogs(currentBlock, toBlock));
        }

        return forkJoin(observables).pipe(
          map(results => results.flat().filter(log => log !== null))
        );
      })
    );
  }

  private async parseTransferLog(log: any, provider: ethers.JsonRpcProvider): Promise<any> {
    const tokenAddress = log.address;
    const transactionEventSignature = log.topics[0];
    const from = '0x' + log.topics[1].slice(26);
    const amount = BigInt(log.data);

    const [timestamp, transactionFunction] = await Promise.all([
      this.getBlockTimestamp(provider, parseInt(log.blockNumber, 16)),
      this.getTransactionFunction(provider, log.transactionHash)
    ]);

    return {
      blockNumber: parseInt(log.blockNumber, 16),
      transactionHash: log.transactionHash,
      transactionEventSignature: transactionEventSignature,
      from: from,
      to: this.treasuryAddress,
      tokenSymbol: this.tokenAddressToSymbol[tokenAddress.toLowerCase()].symbol,
      tokenDecimals: this.tokenAddressToSymbol[tokenAddress.toLowerCase()].decimals,
      amount: amount.toString(),
      timestamp,
      transactionFunction
    };
  }

  private async getBlockTimestamp(provider: ethers.JsonRpcProvider, blockNumber: number): Promise<number> {
    const block = await provider.send('eth_getBlockByNumber', [this.toHex(blockNumber), false]);
    return parseInt(block.timestamp, 16);
  }

  private async getTransactionFunction(provider: ethers.JsonRpcProvider, txHash: string): Promise<string> {
    const tx = await provider.getTransaction(txHash);
    if (tx && tx.data) {
      const functionSignature = tx.data.slice(0, 10);
      const convertionTable: { [key: string]: string } = {
        '0x2c7fa5d8': 'Part evolution',
        '0x6e094ff4': 'Ascend',
        '0x95a4ec00': 'Marketplace',
        '0x2beee4c7': 'Marketplace (bulk)',
        '0x8264f2c2': 'Breed',
        '0x8aff15ec': 'Charm/Rune mint',
        '0x7ff36ab5': 'Mint',
        '0xa9059cbb': 'Transfer',
        '0x43afef80': 'Restore Streak for Atia\'s Blessing'
      };
      return convertionTable[functionSignature] || functionSignature;
    }
    return 'Unknown';
  }

  private toHex(num: number | undefined): string {
    if (num === undefined) {
      throw new Error('Input number is undefined', num);
    }
    return '0x' + num.toString(16);
  }

  private createProvider(apiKey: string): ethers.JsonRpcProvider {
    return new ethers.JsonRpcProvider(`${this.rpcUrl}?apikey=${apiKey}`);
  }

  private async findClosestBlock(provider: ethers.JsonRpcProvider, targetTimestamp: number): Promise<number> {
    let left = 0;
    let right = await provider.getBlockNumber();

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const block = await provider.getBlock(mid);
      if (!block) continue;

      if (block.timestamp === targetTimestamp) {
        return mid;
      } else if (block.timestamp < targetTimestamp) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    // At this point, 'left' is the index of the closest block
    const closestBlock = await provider.getBlock(left);
    const previousBlock = left > 0 ? await provider.getBlock(left - 1) : null;

    if (closestBlock && previousBlock) {
      return Math.abs(closestBlock.timestamp - targetTimestamp) < Math.abs(previousBlock.timestamp - targetTimestamp) ? left : left - 1;
    }

    return left;
  }

  fetchExchangeRates(apiKey: string): Observable<{ [key: string]: number }> {
    const url = 'https://api-gateway.skymavis.com/graphql/axie-marketplace';
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    });

    const queries = [
      { token: 'eth', query: '{ exchangeRate { eth { usd } } }' },
      { token: 'axs', query: '{ exchangeRate { axs { usd } } }' },
      { token: 'slp', query: '{ exchangeRate { slp { usd } } }' }
    ];

    return forkJoin(
      queries.map(({ token, query }) =>
        this.http.post(url, JSON.stringify({ query }), { headers }).pipe(
          map((response: any) => ({ [token]: response.data.exchangeRate[token].usd }))
        )
      )
    ).pipe(
      map(results => Object.assign({}, ...results))
    );
  }
}