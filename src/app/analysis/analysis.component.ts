import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { DataStoreService, TreasuryDataItem } from '../data-store.service';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { enUS } from 'date-fns/locale';
import { format } from 'date-fns';

// Register all Chart.js components
Chart.register(...registerables);
Chart.defaults.locale = 'en-US';

@Component({
    selector: 'app-analysis',
    standalone: true,
    imports: [CommonModule, MatButtonModule],
    template: `
    <div class="analysis-container">
      <h2>Treasury Data Analysis</h2>
      <div *ngIf="dateRange.startDate && dateRange.endDate">
        <p>Data from {{ dateRange.startDate | date:'mediumDate' }} to {{ dateRange.endDate | date:'mediumDate' }}</p>
      </div>
      <div *ngIf="loading">Loading...</div>
      <div *ngIf="!loading && (!treasuryData || treasuryData.length === 0)">
        <p>No data available. Please fetch data from the dashboard first.</p>
      </div>
      <div *ngIf="!loading && treasuryData && treasuryData.length > 0">
        <div class="summary-stats">
          <h3>Summary Statistics</h3>
          <p>Total Transactions: {{ treasuryData.length }}</p>
          <p>Unique Tokens: {{ uniqueTokens.length }}</p>
          <div *ngFor="let token of uniqueTokens">
            <p>{{ token }}: {{ getTotalValueForToken(token) }} USD</p>
          </div>
        </div>
        <div class="chart-container">
          <h3>Function Signature Distribution</h3>
          <canvas #doughnutChartCanvas></canvas>
        </div>
        <div class="chart-container">
          <h3>Token Distribution (USD Value)</h3>
          <canvas #pieChartCanvas></canvas>
        </div>
        <div class="chart-container">
          <h3>Treasury Balance Increase Over Time</h3>
          <canvas #lineChartCanvas></canvas>
        </div>
        <div class="chart-container">
          <h3>Transaction Volume Over Time</h3>
          <canvas #barChartCanvas></canvas>
        </div>
        <div class="chart-container">
          <h3>Top 10 Largest Transactions</h3>
          <canvas #horizontalBarChartCanvas></canvas>
        </div>
        <div class="chart-container">
          <h3>Transfers per Hour by Function</h3>
          <canvas #transfersPerHourCanvas></canvas>
        </div>
      </div>
      <div *ngIf="error" class="error-message">
        {{ error }}
      </div>
      <button mat-raised-button color="primary" (click)="goBack()">Back to Dashboard</button>
    </div>
  `,
    styles: [`
    .analysis-container {
      display: flex;
      flex-direction: column;
      padding: 20px;
    }
    .summary-stats {
      margin-bottom: 20px;
      width: 100%;
      max-width: 1200px;
    }
    .chart-container {
      width: 100%;
      max-width: 1200px;
      height: 628px;
      margin-bottom: 40px;
    }
    .error-message {
      color: red;
      margin-bottom: 20px;
    }
  `]
})
export class AnalysisComponent implements OnInit, AfterViewInit {
    @ViewChild('pieChartCanvas') pieChartCanvas!: ElementRef<HTMLCanvasElement>;
    @ViewChild('lineChartCanvas') lineChartCanvas!: ElementRef<HTMLCanvasElement>;
    @ViewChild('barChartCanvas') barChartCanvas!: ElementRef<HTMLCanvasElement>;
    @ViewChild('horizontalBarChartCanvas') horizontalBarChartCanvas!: ElementRef<HTMLCanvasElement>;
    @ViewChild('doughnutChartCanvas') doughnutChartCanvas!: ElementRef<HTMLCanvasElement>;
    @ViewChild('transfersPerHourCanvas') transfersPerHourCanvas!: ElementRef<HTMLCanvasElement>;

    error: string | null = null;
    treasuryData: TreasuryDataItem[] | null = null;
    uniqueTokens: string[] = [];
    loading = true;
    charts: { [key: string]: Chart } = {};
    exchangeRates: { [key: string]: number } | null = null;
    dateRange: { startDate: Date | null, endDate: Date | null } = { startDate: null, endDate: null };

    private dataLoaded = false;

    constructor(
        private router: Router,
        private dataStoreService: DataStoreService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        this.loadData();
        this.dateRange = this.dataStoreService.getDateRange();
    }

    ngAfterViewInit() {
        if (this.dataLoaded) {
            this.createCharts();
        }
    }

    async loadData() {
        try {
            this.loading = true;
            this.treasuryData = this.dataStoreService.getTreasuryData();
            this.exchangeRates = this.dataStoreService.getExchangeRates();

            if (this.treasuryData && this.treasuryData.length > 0) {
                this.uniqueTokens = [...new Set(this.treasuryData.map(item => item.tokenSymbol))];
                this.dataLoaded = true;
                if (this.pieChartCanvas) {
                    this.createCharts();
                }
            } else {
                console.log('No treasury data available');
            }
        } catch (error) {
            this.error = 'Error loading treasury data. Please try again.';
            console.error('Error loading treasury data:', error);
        } finally {
            this.loading = false;
            this.cdr.detectChanges();
        }
    }

    getTotalValueForToken(tokenSymbol: string): string {
        if (!this.treasuryData) return '0';
        const exchangeRates = this.dataStoreService.getExchangeRates();
        if (!exchangeRates) return '0';

        const totalValue = this.treasuryData
            .filter(item => item.tokenSymbol === tokenSymbol)
            .reduce((sum, item) => {
                const amount = BigInt(item.amount);
                const decimals = BigInt(item.tokenDecimals);
                const tokenAmount = Number(amount) / Math.pow(10, Number(decimals));
                const usdValue = tokenAmount * (exchangeRates[tokenSymbol.toLowerCase()] || 0);
                return sum + usdValue;
            }, 0);

        return totalValue.toFixed(2);
    }

    private createCharts() {
        if (!this.treasuryData || !this.exchangeRates) {
            console.error('No data or exchange rates available for chart creation');
            return;
        }

        this.createPieChart();
        this.createLineChart();
        this.createBarChart();
        this.createHorizontalBarChart();
        this.createDoughnutChart();
        this.createTransfersPerHourChart();
    }

    private createPieChart() {
        if (!this.pieChartCanvas) {
            console.error('Pie chart canvas not available');
            return;
        }
        const ctx = this.pieChartCanvas.nativeElement.getContext('2d');
        if (!ctx) return;

        const tokenTotals = this.uniqueTokens.map(token => ({
            token,
            total: parseFloat(this.getTotalValueForToken(token))
        }));

        const config: ChartConfiguration = {
            type: 'pie',
            data: {
                labels: tokenTotals.map(item => item.token),
                datasets: [{
                    data: tokenTotals.map(item => item.total),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(153, 102, 255, 0.8)',
                    ],
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Token Distribution (USD Value)'
                    }
                }
            }
        };

        this.charts['pie'] = new Chart(ctx, config);
    }

    private createLineChart() {
        const ctx = this.lineChartCanvas.nativeElement.getContext('2d');
        if (!ctx || !this.treasuryData) return;

        const sortedData = this.treasuryData.sort((a, b) => a.timestamp - b.timestamp);
        const dates = sortedData.map(item => new Date(item.timestamp * 1000));
        const balances = this.calculateCumulativeBalance(sortedData);

        const config: ChartConfiguration<'line'> = {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Treasury Balance (USD)',
                    data: balances,
                    fill: false,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day'
                        },
                        adapters: {
                            date: {
                                locale: enUS
                            }
                        }
                    },
                    y: {
                        beginAtZero: true
                    }
                }
            }
        };

        this.charts['line'] = new Chart(ctx, config);
    }

    private createBarChart() {
        const ctx = this.barChartCanvas.nativeElement.getContext('2d');
        if (!ctx || !this.treasuryData) return;

        const transactionsByDay = this.groupTransactionsByDay(this.treasuryData);
        const dates = Object.keys(transactionsByDay).map(date => new Date(date));
        const volumes = Object.values(transactionsByDay);

        const config: ChartConfiguration<'bar'> = {
            type: 'bar',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Transaction Volume',
                    data: volumes,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day'
                        },
                        adapters: {
                            date: {
                                locale: enUS
                            }
                        }
                    },
                    y: {
                        beginAtZero: true
                    }
                }
            }
        };

        this.charts['bar'] = new Chart(ctx, config);
    }

    private createHorizontalBarChart() {
        const ctx = this.horizontalBarChartCanvas.nativeElement.getContext('2d');
        if (!ctx || !this.treasuryData || !this.exchangeRates) return;

        const topTransactions = this.getTopTransactions(this.treasuryData, this.exchangeRates, 10);

        const config: ChartConfiguration = {
            type: 'bar',
            data: {
                labels: topTransactions.map(tx => `${tx.tokenSymbol} - ${new Date(tx.timestamp * 1000).toLocaleDateString()}`),
                datasets: [{
                    label: 'Transaction Value (USD)',
                    data: topTransactions.map(tx => tx.usdValue),
                    backgroundColor: 'rgba(153, 102, 255, 0.6)',
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Top 10 Largest Transactions'
                    }
                }
            }
        };

        this.charts['horizontalBar'] = new Chart(ctx, config);
    }

    private calculateCumulativeBalance(data: TreasuryDataItem[]): number[] {
        let balance = 0;
        return data.map(item => {
            const amount = Number(item.amount) / Math.pow(10, item.tokenDecimals);
            const usdValue = amount * (this.exchangeRates?.[item.tokenSymbol.toLowerCase()] || 0);
            balance += usdValue;
            return balance;
        });
    }

    private groupTransactionsByDay(data: TreasuryDataItem[]): { [key: string]: number } {
        return data.reduce((acc, item) => {
            const date = new Date(item.timestamp * 1000);
            const dateString = date.toISOString().split('T')[0];
            acc[dateString] = (acc[dateString] || 0) + 1;
            return acc;
        }, {} as { [key: string]: number });
    }

    private getTopTransactions(data: TreasuryDataItem[], exchangeRates: { [key: string]: number }, limit: number): any[] {
        return data.map(item => {
            const amount = Number(item.amount) / Math.pow(10, item.tokenDecimals);
            const usdValue = amount * (exchangeRates[item.tokenSymbol.toLowerCase()] || 0);
            return { ...item, usdValue };
        })
            .sort((a, b) => b.usdValue - a.usdValue)
            .slice(0, limit);
    }

    goBack() {
        this.router.navigate(['/']);
    }

    private createDoughnutChart() {
        if (!this.doughnutChartCanvas) {
            console.error('Doughnut chart canvas not available');
            return;
        }
        const ctx = this.doughnutChartCanvas.nativeElement.getContext('2d');
        if (!ctx) return;

        const { labels, data } = this.calculateFunctionSignatureDistribution();

        const config: ChartConfiguration = {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(153, 102, 255, 0.8)',
                        'rgba(255, 159, 64, 0.8)',
                        'rgba(199, 199, 199, 0.8)',
                        'rgba(83, 102, 255, 0.8)',
                        'rgba(40, 159, 64, 0.8)',
                        'rgba(210, 199, 199, 0.8)',
                    ],
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'USD Distribution by Function Signature'
                    }
                }
            }
        };

        this.charts['doughnut'] = new Chart(ctx, config);
    }

    private calculateFunctionSignatureDistribution(): { labels: string[], data: number[] } {
        if (!this.treasuryData || !this.exchangeRates) return { labels: [], data: [] };

        const distribution: { [key: string]: number } = {};

        this.treasuryData.forEach(item => {
            const amount = Number(item.amount) / Math.pow(10, item.tokenDecimals);
            const usdValue = amount * (this.exchangeRates?.[item.tokenSymbol.toLowerCase()] || 0);

            if (!distribution[item.transactionFunction]) {
                distribution[item.transactionFunction] = 0;
            }
            distribution[item.transactionFunction] += usdValue;
        });

        const sortedDistribution = Object.entries(distribution)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10); // Get top 10 function signatures

        return {
            labels: sortedDistribution.map(([label]) => label),
            data: sortedDistribution.map(([, value]) => value)
        };
    }

    private createTransfersPerHourChart() {
        const ctx = this.transfersPerHourCanvas.nativeElement.getContext('2d');
        if (!ctx || !this.treasuryData) return;

        const transfersByHourAndFunction = this.groupTransfersByHourAndFunction(this.treasuryData);
        const hours = Array.from(new Set(this.treasuryData.map(item =>
            format(new Date(item.timestamp * 1000), 'yyyy-MM-dd HH:00')
        ))).sort();

        const datasets = Object.entries(transfersByHourAndFunction).map(([func, data], index) => ({
            label: func,
            data: hours.map(hour => data[hour] || 0),
            borderColor: this.getColor(index),
            fill: false,
        }));

        const config: ChartConfiguration<'line'> = {
            type: 'line',
            data: {
                labels: hours,
                datasets: datasets,
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'hour',
                            displayFormats: {
                                hour: 'MMM d, HH:00'
                            }
                        },
                        adapters: {
                            date: {
                                locale: enUS
                            }
                        },
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Transfers'
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Transfers per Hour by Function'
                    }
                }
            }
        };

        this.charts['transfersPerHour'] = new Chart(ctx, config);
    }

    private groupTransfersByHourAndFunction(data: TreasuryDataItem[]): { [key: string]: { [key: string]: number } } {
        return data.reduce((acc, item) => {
            const hour = format(new Date(item.timestamp * 1000), 'yyyy-MM-dd HH:00');
            const func = item.transactionFunction;

            if (!acc[func]) acc[func] = {};
            if (!acc[func][hour]) acc[func][hour] = 0;

            acc[func][hour]++;
            return acc;
        }, {} as { [key: string]: { [key: string]: number } });
    }

    private getColor(index: number): string {
        const colors = [
            'rgb(255, 99, 132)', 'rgb(54, 162, 235)', 'rgb(255, 206, 86)',
            'rgb(75, 192, 192)', 'rgb(153, 102, 255)', 'rgb(255, 159, 64)',
            'rgb(199, 199, 199)', 'rgb(83, 102, 255)', 'rgb(40, 159, 64)',
            'rgb(210, 199, 199)'
        ];
        return colors[index % colors.length];
    }
}