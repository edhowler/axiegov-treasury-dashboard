import { Component, OnInit } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { DataService } from '../data.service';
import { Chart } from 'chart.js';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    FormsModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule
  ],
  providers: [DataService]
})
export class DashboardComponent implements OnInit {
  treasuryTransfers: any[] = [];
  ethAccumulationData: any;
  inflows: any[] = [];
  outflows: any[] = [];
  apiKey: string = '';
  startDate: Date | null = null;
  endDate: Date | null = null;
  minEndDate: Date | null = null;

  constructor(
    private dataService: DataService,
  ) { }

  ngOnInit(): void {
    this.loadApiKey();
    this.loadDates();
    this.fetchEthAccumulationData();
    this.updateMinEndDate();
  }

  loadApiKey(): void {
    const savedApiKey = localStorage.getItem('apiKey');
    if (savedApiKey) {
      this.apiKey = savedApiKey;
    }
  }

  saveApiKey(): void {
    localStorage.setItem('apiKey', this.apiKey);
  }

  loadDates(): void {
    const savedStartDate = localStorage.getItem('startDate');
    const savedEndDate = localStorage.getItem('endDate');

    if (savedStartDate) {
      this.startDate = new Date(savedStartDate);
    }
    if (savedEndDate) {
      this.endDate = new Date(savedEndDate);
    }
  }

  saveDates(): void {
    if (this.startDate) {
      localStorage.setItem('startDate', this.startDate.toISOString());
    }
    if (this.endDate) {
      localStorage.setItem('endDate', this.endDate.toISOString());
    }
  }

  updateMinEndDate(): void {
    this.minEndDate = this.startDate ? new Date(this.startDate) : null;
  }

  onStartDateChange(): void {
    this.saveDates();
    this.updateMinEndDate();

    // If end date is before start date, reset it
    if (this.endDate && this.startDate && this.endDate < this.startDate) {
      this.endDate = null;
    }
  }

  onEndDateChange(): void {
    this.saveDates();
  }

  async fetchTreasuryTransfers(): Promise<void> {
    if (!this.apiKey || !this.startDate || !this.endDate) {
      console.error('API key and both dates are required');
      return;
    }

    const startTimestamp = Math.floor(this.startDate.getTime() / 1000);
    const endTimestamp = Math.floor(this.endDate.getTime() / 1000);

    try {
      const newData = await firstValueFrom(this.dataService.fetchTreasuryTransfers(startTimestamp, endTimestamp, this.apiKey));
      if (newData && newData.length > 0) {
        this.treasuryTransfers = newData;
        this.processTreasuryTransfers();
      } else {
        console.log('No transfers to the treasury address found in the specified time range.');
      }
    } catch (error) {
      console.error('Error fetching treasury transfers:', error);
    }
  }

  private processTreasuryTransfers(): void {
    // Group transfers by token address
    const transfersByToken = this.treasuryTransfers.reduce((acc: { [key: string]: any[] }, transfer: any) => {
      if (!acc[transfer.tokenSymbol]) {
        acc[transfer.tokenSymbol] = [];
      }
      acc[transfer.tokenSymbol].push(transfer);
      return acc;
    }, {});

    // Calculate total amount for each token
    for (const [tokenSymbol, transfers] of Object.entries(transfersByToken)) {
      const totalAmount = (transfers as any[]).reduce((sum: bigint, transfer: any) => {
        const amount = BigInt(transfer.amount);
        const decimals = transfer.tokenDecimals;
        return sum + (amount / BigInt(10 ** decimals));
      }, BigInt(0));

      console.log(`Token ${tokenSymbol}:`);
      console.log(`  Total amount: ${totalAmount.toString()}`);
      console.log(`  Transfers:`);
      (transfers as any[]).forEach((transfer: any) => {
        const date = new Date(transfer.timestamp * 1000).toISOString();
        const adjustedAmount = Number(BigInt(transfer.amount) * BigInt(1000000) / BigInt(10 ** transfer.tokenDecimals)) / 1000000;
        console.log(`    - Amount: ${adjustedAmount.toFixed(6)}, transactionFunction: ${transfer.transactionFunction}, transactionHash: ${transfer.transactionHash}, From: ${transfer.from}, Timestamp: ${date}`);
      });
    }
  }

  private fetchEthAccumulationData(): void {
    // Similar to fetchTreasuryData, but for ETH accumulation
    // ...
  }

  private processInflowsOutflows(): void {
    // Process treasuryData to separate inflows and outflows
    // This is where you'd implement the logic to categorize different types of transactions
    // ...
  }

  createCharts(): void {
    // Create charts using Chart.js
    // You'd implement this method to create visualizations for both tracks
    // ...
  }
}