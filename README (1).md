

# Replication Summary Landing Page

A simple, responsive landing page to display metadata and connections between original and replicated studies.




## Overview
This tool allows users to check whether a scientific study has been replicated by entering its DOI. It fetches metadata from the FReD API, displays original and replication study details, and visualizes relationships using a network diagram.
## Roadmap

- Additional browser support

- Add more integrations

## Features
- DOI input field with fallback message
- Responsive layout for desktop and mobile
- Placeholder sections for metadata display
- Suggested visualization using Highcharts (ResearchRabbit-style)

## Workflow Summary

         1. User Input The user enters a DOI in the input field.
         
         2. API Request (The tool sends a request to the FReD API)
         
         3. Response Handling
             If data is found:
             The original study metadata is rendered.
             Replication studies are listed in a summary table.
             A D3-based graph visualizes relationships between studies.
        
            If no data is found:
             A fallback message is shown with a link to suggest a new replication.
        
        
         4. Graph Rendering:
            Graph shows relation between orignal and replication in visualization form
    

## Conclusion

This project is part of a collaborative effort to improve replication visibility in science. Contributions, feedback, and extensions are welcome!