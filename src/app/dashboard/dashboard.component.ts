import { Component, OnInit } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { DataService } from '../data.service';
import { DataStoreService } from '../data-store.service';
import { Router } from '@angular/router';
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
    MatButtonModule,
    MatProgressBarModule
  ],
  providers: [DataService]
})
export class DashboardComponent implements OnInit {
  treasuryTransfers: any[] = [];
  ethAccumulationData: any;
  inflows: any[] = [];
  outflows: any[] = [];
  apiKey: string = '';
  selectedDate: Date | null = null;
  exchangeRates: { [key: string]: number } | null = null;
  isLoading: boolean = false;
  loadingProgress: number = 0;

  constructor(
    private dataService: DataService,
    private dataStoreService: DataStoreService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadApiKey();
    this.loadDate();
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

  loadDate(): void {
    const savedDate = localStorage.getItem('selectedDate');
    if (savedDate) {
      this.selectedDate = new Date(savedDate);
    }
  }

  saveDate(): void {
    if (this.selectedDate) {
      localStorage.setItem('selectedDate', this.selectedDate.toISOString());
    }
  }

  onDateChange(): void {
    this.saveDate();
  }

  async fetchTreasuryTransfers(): Promise<void> {
    if (!this.apiKey || !this.selectedDate) {
      console.error('API key and date are required');
      return;
    }

    this.isLoading = true;
    this.loadingProgress = 0;

    const startOfDay = new Date(this.selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(this.selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const startTimestamp = Math.floor(startOfDay.getTime() / 1000);
    const endTimestamp = Math.floor(endOfDay.getTime() / 1000);

    try {
      // Fetch exchange rates first
      this.exchangeRates = await firstValueFrom(this.dataService.fetchExchangeRates(this.apiKey));
      console.log('Exchange rates:', this.exchangeRates);

      const newData = await firstValueFrom(this.dataService.fetchTreasuryTransfers(
        startTimestamp,
        endTimestamp,
        this.apiKey,
        (progress) => {
          this.loadingProgress = progress;
        }
      ));

      if (newData && Array.isArray(newData) && newData.length > 0) {
        this.treasuryTransfers = newData;
        this.dataStoreService.setTreasuryData(this.treasuryTransfers);
        this.dataStoreService.setExchangeRates(this.exchangeRates);
        this.dataStoreService.setDateRange(startOfDay, endOfDay);
        this.router.navigate(['/analysis']);
      } else {
        console.log('No transfers to the treasury address found in the specified time range.');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      this.isLoading = false;
    }
  }
}