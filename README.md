# fred_repl_landing_page

![GitHub stars](https://img.shields.io/github/stars/Ifeanyi55/fred_repl_landing_page)
![GitHub forks](https://img.shields.io/github/forks/Ifeanyi55/fred_repl_landing_page)
![GitHub issues](https://img.shields.io/github/issues/Ifeanyi55/fred_repl_landing_page)
![GitHub commits](https://img.shields.io/github/last-commit/Ifeanyi55/fred_repl_landing_page)

Generate landing pages that summarise and link to replication attempts given an original DOI

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Workflow Summary](#workflow-summary)
- [Getting Started](#getting-started)
- [Contributing](#contributing)
- [Available Scripts](#available-scripts)
- [Deployment](#deployment)

## Overview

This tool allows users to check whether a scientific study has been replicated by entering its DOI. It fetches metadata from the FReD API, displays original and replication study details, and visualizes relationships using a network diagram.

## Features

- DOI input field with fallback message
- Responsive layout for desktop and mobile
- Placeholder sections for metadata display
- Suggested visualization using Highcharts (ResearchRabbit-style)

## Workflow Summary

1. **User Input**: The user enters a DOI in the input field.
2. **API Request**: The tool sends a request to the FReD API.
3. **Response Handling**:
   - If data is found, the original study metadata is rendered, replication studies are listed in a summary table, and a D3-based graph visualizes relationships between studies.
   - If no data is found, a fallback message is shown with a link to suggest a new replication.
4. **Graph Rendering**: The graph shows the relationship between the original and replication in a visualization.

## Workflow Diagram

The following diagram illustrates the workflow of the project:

![Flow Chart](project-assets/Flow%20chart.png)

## Getting Started

To get started, you'll need to install the dependencies:

```bash
$ npm install # or pnpm install or yarn install
```

## Available Scripts

In the project directory, you can run:

### `npm run dev`

Runs the app in the development mode.<br>
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### `npm run build`

Builds the app for production to the `dist` folder.<br>
It correctly bundles Solid in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

## Contributing

Contributions are welcome! Please open an issue or submit a pull request with your changes.

## Deployment

Details on how to deploy this project will be added soon.

