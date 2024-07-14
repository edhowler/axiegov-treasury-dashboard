# AxiegovTreasuryDashboard

## Team Howler

This project was created for the AxieGov Data Hackathon. It provides a comprehensive dashboard for analyzing the AxieGov Treasury data.

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 18.0.7.

## Features

- Fetches and analyzes treasury transfer data for a specific day
- Visualizes token distribution, treasury balance over time, and transaction volumes
- Displays top 10 largest transactions
- Shows function signature distribution
- Presents transfers per hour by function
- Provides summary statistics for the analyzed period

## Technology Stack

- Angular 18
- Chart.js for data visualization
- Ethers.js for blockchain interaction

## Installation and Running Locally

1. Clone the repository:
   ```
   git clone https://github.com/your-username/axiegov-treasury-dashboard.git
   cd axiegov-treasury-dashboard
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   ng serve
   ```

4. Open your browser and navigate to `http://localhost:4200/`

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Usage

1. Enter your API key in the dashboard
2. Select a specific date for the analysis
3. Click "Download and Analyze Data" to fetch and process the treasury data
4. View the generated charts and statistics on the analysis page

## Project Structure

The main components of the project are:

- `DashboardComponent`: Handles user input and data fetching
- `AnalysisComponent`: Displays charts and statistics
- `DataService`: Manages API calls and data processing
- `DataStoreService`: Stores and manages the fetched data

## License

This project is licensed under the GPL-3.0-or-later License.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Acknowledgments

- AxieGov for providing the data and hosting the hackathon
- The Angular and Chart.js communities for their excellent documentation and support

For more information about the AxieGov Data Hackathon, please visit [the official blog post](https://blog.axieinfinity.com/p/axiegov-data-hackathon).