import { Injectable } from '@angular/core';

export interface TreasuryDataItem {
  blockNumber: number;
  transactionHash: string;
  transactionEventSignature: string;
  from: string;
  to: string;
  tokenSymbol: string;
  tokenDecimals: number;
  amount: string;
  timestamp: number;
  transactionFunction: string;
}

@Injectable({
  providedIn: 'root'
})
export class DataStoreService {
  private treasuryData: TreasuryDataItem[] = [];
  private exchangeRates: { [key: string]: number } | null = null;
  private startDate: Date | null = null;
  private endDate: Date | null = null;

  getTreasuryData(): TreasuryDataItem[] {
    return this.treasuryData;
  }

  setTreasuryData(data: TreasuryDataItem[]): void {
    try {
      if (!this.validateData(data)) {
        throw new Error('Invalid data format');
      }
      this.treasuryData = data;
      console.log('Treasury data set in service:', this.treasuryData);
    } catch (error) {
      console.error('Error setting treasury data:', error);
      throw error;
    }
  }

  setDateRange(startDate: Date, endDate: Date): void {
    this.startDate = startDate;
    this.endDate = endDate;
  }

  getDateRange(): { startDate: Date | null, endDate: Date | null } {
    return { startDate: this.startDate, endDate: this.endDate };
  }

  setExchangeRates(rates: { [key: string]: number } | null): void {
    if (rates) {
      // Replace 'eth' with 'weth' if it exists
      if ('eth' in rates) {
        rates['weth'] = rates['eth'];
        delete rates['eth'];
      }
    }
    this.exchangeRates = rates;
  }

  getExchangeRates(): { [key: string]: number } | null {
    return this.exchangeRates;
  }

  getDataForToken(tokenSymbol: string): TreasuryDataItem[] {
    return this.getTreasuryData().filter(item => item.tokenSymbol === tokenSymbol);
  }

  clearData(): void {
    this.treasuryData = [];
  }

  getTotalValueByToken(): { [key: string]: string } {
    return this.getTreasuryData().reduce((acc, item) => {
      if (!acc[item.tokenSymbol]) {
        acc[item.tokenSymbol] = '0';
      }
      acc[item.tokenSymbol] = (BigInt(acc[item.tokenSymbol]) + BigInt(item.amount)).toString();
      return acc;
    }, {} as { [key: string]: string });
  }

  private validateData(data: any): data is TreasuryDataItem[] {
    if (!Array.isArray(data)) return false;
    return data.every(item =>
      typeof item.blockNumber === 'number' &&
      typeof item.transactionHash === 'string' &&
      typeof item.transactionEventSignature === 'string' &&
      typeof item.from === 'string' &&
      typeof item.to === 'string' &&
      typeof item.tokenSymbol === 'string' &&
      typeof item.tokenDecimals === 'number' &&
      typeof item.amount === 'string' &&
      typeof item.timestamp === 'number' // Added timestamp check
    );
  }
}