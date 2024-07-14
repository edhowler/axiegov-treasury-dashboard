import { Injectable } from '@angular/core';
import { ethers } from 'ethers';
import { Observable, from, forkJoin } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private rpcUrl = 'http://archive.axiedao.org/temporary-hackathon-rpc';
  private treasuryAddress = '0x245db945c485b68fdc429e4f7085a1761aa4d45d';
  private tokenAddressToSymbol: { [key: string]: { symbol: string, decimals: number } } = {
    '0xc99a6a985ed2cac1ef41640596c5a5f9f4e19ef5': { symbol: 'WETH', decimals: 18 },
    '0x97a9107c1793bc407d6f527b77e7fff4d812bece': { symbol: 'AXS', decimals: 18 },
    '0xa8754b9fa15fc18bb59458815510e40a12cd2014': { symbol: 'SLP', decimals: 0 }
  };
  constructor() { }

  fetchTreasuryTransfers(startTimestamp: number, endTimestamp: number, apiKey: string): Observable<any[]> {
    const provider = this.createProvider(apiKey);
    const paddedTreasuryAddress = '0x000000000000000000000000' + this.treasuryAddress.slice(2).toLowerCase();

    return forkJoin([
      from(this.findClosestBlock(provider, startTimestamp)),
      from(this.findClosestBlock(provider, endTimestamp))
    ]).pipe(
      mergeMap(([startBlock, endBlock]) => {
        const params = [{
          fromBlock: this.toHex(startBlock),
          toBlock: this.toHex(endBlock),
          topics: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', // Transfer event signature
            null,
            paddedTreasuryAddress
          ]
        }];

        return from(provider.send('eth_getLogs', params)).pipe(
          mergeMap((logs: any[]) => {
            const parsedLogs = logs.map((log: any) => this.parseTransferLog(log));
            return forkJoin(
              parsedLogs.map((log: any) =>
                forkJoin([
                  from(this.getBlockTimestamp(provider, log.blockNumber)),
                  from(this.getTransactionFunction(provider, log.transactionHash))
                ]).pipe(
                  map(([timestamp, transactionFunction]) => ({ ...log, timestamp, transactionFunction }))
                )
              )
            );
          })
        );
      })
    );
  }

  private parseTransferLog(log: any): any {
    const tokenAddress = log.address;
    const transactionEventSignature = log.topics[0];
    const from = '0x' + log.topics[1].slice(26);
    const amount = BigInt(log.data);

    return {
      blockNumber: parseInt(log.blockNumber, 16),
      transactionHash: log.transactionHash,
      transactionEventSignature: transactionEventSignature,
      from: from,
      to: this.treasuryAddress,
      tokenSymbol: this.tokenAddressToSymbol[tokenAddress.toLowerCase()].symbol,
      tokenDecimals: this.tokenAddressToSymbol[tokenAddress.toLowerCase()].decimals,
      amount: amount.toString()
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
        '0xa9059cbb': 'Transfer'
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
    let closestBlock = right;
    let closestDiff = Infinity;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const block = await provider.getBlock(mid);
      if (!block) continue;

      const diff = Math.abs(block.timestamp - targetTimestamp);

      if (diff < closestDiff) {
        closestDiff = diff;
        closestBlock = mid;
      }

      if (block.timestamp < targetTimestamp) {
        left = mid + 1;
      } else if (block.timestamp > targetTimestamp) {
        right = mid - 1;
      } else {
        return mid;
      }
    }

    return closestBlock;
  }
}