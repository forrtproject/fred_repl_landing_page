# FReD_repl_landing_page
Generate landing pages that summarise and link to replication attempts given an original DOI

## Flow Chart

![Flow Chart](project-assets/Flow%20chart.png)

## Example Landing Page

Explore the design prototype:

[View Example Landing Page Design](https://figma.com/design/u46XGX6Uq4D3FPhBRzbN5V/Replication-Summary?t=mq95eytelNppAD5j-0)

## Built With
The landing is built with solid js. Learn more on the [Solid Website](https://solidjs.com).


## API Endpoint

- **Endpoint**: `https://your-api.org/replications?doi=10.1037/xge0001234`
- **Response format**:
```json
[
  {
    "doi": "10.1037/xge0001234",
    "title": "Replication of XYZ",
    "authors": "Smith et al.",
    "journal": "Journal of Experimental Psychology",
    "year": 2021,
    "outcome": "success"
  }
]




# FReD Replication Summary Landing Page

A simple, responsive landing page to display metadata and connections between original and replicated studies.

## Overview

This tool allows users to check whether a scientific study has been replicated by entering its DOI. It fetches metadata from the FReD API, displays original and replication study details.

## Flow Chart

![Flow Chart](project-assets/Flow%20chart.png)

## Example Landing Page

Explore the design prototype:

[View Example Landing Page Design](https://figma.com/design/u46XGX6Uq4D3FPhBRzbN5V/Replication-Summary?t=mq95eytelNppAD5j-0)

## Built With
The landing is built with solid js. Learn more on the [Solid Website](https://solidjs.com).


## API Endpoint

- **Endpoint**: `https://your-api.org/replications?doi=10.1037/xge0001234`
- **Response format**:
```json
[
  {
    "doi": "10.1037/xge0001234",
    "title": "Replication of XYZ",
    "authors": "Smith et al.",
    "journal": "Journal of Experimental Psychology",
    "year": 2021,
    "outcome": "success"
  }
]



## To Contribute

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

## Deployment





## Demo DOIs

Use these examples to test:

- **Multiple replications**: `10.1037/xge0001234`
- **No replications found**: `10.1016/j.jesp.2020.104020`
