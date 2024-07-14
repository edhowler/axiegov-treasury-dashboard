import { Injectable } from '@angular/core';

interface TreasuryDataItem {
  from: string;
  blockTime: number;
  tokenName: string;
  tokenSymbol: string;
  value: string;
}

@Injectable({
  providedIn: 'root'
})
export class DataStoreService {
  private readonly STORAGE_KEY = 'treasuryData';
  private treasuryData: { [tokenSymbol: string]: TreasuryDataItem[] } = {};

  constructor() {
    this.loadFromStorage();
  }

  async setTreasuryData(data: TreasuryDataItem[]): Promise<void> {
    this.treasuryData = data.reduce((acc, item) => {
      if (!acc[item.tokenSymbol]) {
        acc[item.tokenSymbol] = [];
      }
      acc[item.tokenSymbol].push(item);
      return acc;
    }, {} as { [tokenSymbol: string]: TreasuryDataItem[] });

    await this.saveToStorage();
  }

  async getTreasuryData(): Promise<{ [tokenSymbol: string]: TreasuryDataItem[] } | null> {
    return this.treasuryData;
  }

  getDataForToken(tokenSymbol: string): TreasuryDataItem[] | null {
    return this.treasuryData[tokenSymbol] || null;
  }

  searchByDateRange(startDate: number, endDate: number): TreasuryDataItem[] {
    return Object.values(this.treasuryData)
      .flat()
      .filter(item => item.blockTime >= startDate && item.blockTime <= endDate);
  }

  private async saveToStorage(): Promise<void> {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.treasuryData));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      if (storedData) {
        this.treasuryData = JSON.parse(storedData);
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  }
}