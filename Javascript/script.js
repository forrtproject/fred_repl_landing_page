
////////// Fetch data from API/////////////
const API_URL = "https://ouj1xoiypb.execute-api.eu-central-1.amazonaws.com/v1/original-lookup";

const doiInput = document.getElementById("doiInput");
const fetchBtn = document.getElementById("fetchBtn");
const summaryBox = document.getElementById("summary");
const resultBox = document.getElementById("result");
const fallbackBox = document.getElementById("fallback");

fetchBtn.addEventListener("click", () => {
    const doi = doiInput.value.trim();
    if (doi) fetchData(doi);
});

async function fetchData(doi) {
  summaryBox.innerHTML = "";
  resultBox.innerHTML = "";
  fallbackBox.style.display = "none";

  const normalizedDOI = doi.trim().toLowerCase();
  const encodedDOI = encodeURIComponent(normalizedDOI);

  try {
    const response = await fetch(`${API_URL}?doi=${encodedDOI}`);
    const result = await response.json();

    const candidate = result.results?.[normalizedDOI]?.candidate;
    const meta = candidate?.meta;

    if (!meta || !meta.replications || meta.replications.length === 0) {
      showFallback(normalizedDOI);
      return;
    }

    /////////// Extract original study from first replication record

    const original = {
      authors: meta.replications[0].author_o.map(a => `${a.given} ${a.family}`).join(", "),
      title: meta.replications[0].title_o,
      journal: meta.replications[0].journal_o,
      year: meta.replications[0].year_o,
      doi: meta.replications[0].doi_o
    };

    /////////////// Extract replications
    const replications = meta.replications.map(rep => ({
      authors: rep.author_r.map(a => `${a.given} ${a.family}`).join(", "),
      title: rep.title_r,
      journal: rep.journal_r,
      year: rep.year_r,
      doi: rep.doi_r,
      outcome: rep.outcome || "na"
    }));

    renderOriginal(original);
    renderReplications(replications, original.doi);

////////////    
const graphData = {
  nodes: [
    {
      id: original.doi,
      group: "original",
      label: original.authors,
      title: original.title,
      url: `https://doi.org/${original.doi}`
    },
    ...replications.map(rep => ({
      id: rep.doi,
      group: "replication",
      label: rep.authors,
      title: rep.title,
      url: `https://doi.org/${rep.doi}`
    }))
  ],
  links: replications.map(rep => ({
    source: original.doi,
    target: rep.doi
  }))
};

renderGraph(graphData);

  } catch (error) {
    console.error("Error:", error);
    showFallback(normalizedDOI);
  }
}


function renderOriginal(original) {
    const container = document.getElementById("originalStudy");
    container.innerHTML = `
    <h2>Original Study</h2>
    <p><strong>Authors:</strong> ${original.authors || "N/A"}</p>
    <p><strong>Title:</strong> ${original.title || "N/A"}</p>
    <p><strong>Journal:</strong> ${original.journal || "N/A"} (${original.year || "N/A"})</p>
    <p><strong>DOI:</strong> <a href="https://doi.org/${original.doi}" target="_blank">${original.doi}</a></p>
    ${original.doi ? `<p><a href="https://pubpeer.com/search?q=${original.doi}" target="_blank">View on PubPeer</a></p>` : ""}
  `;
}
function renderReplications(replications, originalDOI) {
    const container = document.getElementById("replicationSummary");

    if (replications.length === 0) {
        container.innerHTML = "<p>No replications found.</p>";
        return;
    }


const counts = { success: 0, mixed: 0, failure: 0 };

replications.forEach(r => {
  const rawOutcome = (r.outcome || "").toLowerCase().trim();

  // Map variants to standard keys
  let normalized;
  if (rawOutcome === "successful") normalized = "success";
  else if (rawOutcome === "failed") normalized = "failure";
  else if (["success", "failure", "mixed"].includes(rawOutcome)) normalized = rawOutcome;

  if (normalized && normalized in counts) {
    counts[normalized]++;
  }
});







    const summaryText = `${replications.length} replications found: ${counts.success}  success, ${counts.failure}  failure, ${counts.mixed}  mixed`;

    let tableHTML = `
    <h2>Replication Summary</h2>
    <p><strong>${summaryText}</strong></p>
    <table>
      <tr>
        <th>Authors</th>
        <th>Title</th>
        <th>Journal</th>
        <th>Year</th>
        <th>DOI</th>
        <th>Outcome</th>
        <th>PubPeer</th>
        <th>Flag Issue</th>
      </tr>
  `;


    replications.forEach(rep => {
        const icon = getOutcomeIcon(rep.outcome);
        const pubpeerLink = rep.doi ? `https://pubpeer.com/search?q=${rep.doi}` : "#";
        const flagLink = `mailto:fred@forrt.org?subject=[Replication Flag] ${originalDOI}&body=I would like to flag a potential issue in the replication record for:%0AOriginal DOI: ${originalDOI}%0AReplication DOI: ${rep.doi}%0AIssue details: [your comment here]`;

        tableHTML += `
      <tr>
        <td>${rep.authors || "N/A"}</td>
        <td>${rep.title || "N/A"}</td>
        <td>${rep.journal || "N/A"}</td>
        <td>${rep.year || "N/A"}</td>
        <td><a href="https://doi.org/${rep.doi}" target="_blank">${rep.doi}</a></td>
        <td>${icon} ${rep.outcome}</td>
        <td><a href="${pubpeerLink}" target="_blank">PubPeer</a></td>
        <td><a href="${flagLink}">Flag Issue</a></td>
      </tr>
    `;
    });

    tableHTML += "</table>";
    container.innerHTML = tableHTML;
}

/// Table shows replications Summary//////
function getOutcomeIcon(outcome) {
    switch (outcome) {
        case "success":
            return '<img src="icons/correct.png" alt="Success" width="20">';
        case "failure":
            return '<img src="icons/failure.png" alt="Failure" width="20">';
        case "mixed":
            return "⚠️";
        case "na":
            return "NA";
        default:
            return "";
    }
}

/////////// Fallback when enter doi that does not matches////////

function showFallback(doi) {
    fallbackBox.innerHTML = `
    <p>No record found. <a href="https://docs.google.com/forms/d/e/1FAIpQLSeMCwdtP0TPgL55stniuyyTxnNwyC34mO4VUuLcQwYrLI89sQ/viewform?usp=pp_url&entry.1234567890=${encodeURIComponent(doi)}" target="_blank">Suggest a new replication</a></p>
  `;
    fallbackBox.style.display = "block";
}


function renderGraph(data) {
  d3.select("#replicationGraph").selectAll("*").remove(); // Clear old graph

  const width = 950;
  const height = 650;

  const svg = d3.select("#replicationGraph")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const simulation = d3.forceSimulation(data.nodes)
    .force("link", d3.forceLink(data.links).id(d => d.id).distance(150))
    .force("charge", d3.forceManyBody().strength(-300))
    .force("center", d3.forceCenter(width / 2, height / 2));

  const link = svg.append("g")
    .selectAll("line")
    .data(data.links)
    .enter().append("line")
    .attr("stroke", "#999")
    .attr("stroke-width", 2);

  const node = svg.append("g")
    .selectAll("circle")
    .data(data.nodes)
    .enter().append("circle")
    .attr("r", d => d.group === "original" ? 20 : 10)
    .attr("fill", d => d.group === "original" ? "#1f77b4" : "#ff7f0e")
    .call(drag(simulation));

  const label = svg.append("g")
    .selectAll("text")
    .data(data.nodes)
    .enter().append("text")
    .text(d => d.label)
    .attr("font-size", "10px")
    .attr("dx", 12)
    .attr("dy", ".35em");

  node.on("click", (event, d) => {
    window.open(d.url, "_blank");
  });

  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    node
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);

    label
      .attr("x", d => d.x)
      .attr("y", d => d.y);

      
  });

  function drag(simulation) {
    return d3.drag()
      .on("start", event => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      })
      .on("drag", event => {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      })
      .on("end", event => {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      });
  }
}



/// newly added
const graphData = {
  nodes: [
    {
      id: original.doi,
      group: "original",
      label: original.authors,
      title: original.title,
      url: `https://doi.org/${original.doi}`
    },
    ...replications.map(rep => ({
      id: rep.doi,
      group: "replication",
      label: rep.authors,
      title: rep.title,
      url: `https://doi.org/${rep.doi}`
    }))
  ],
  links: replications.map(rep => ({
    source: original.doi,
    target: rep.doi
  }))
};

renderGraph(graphData);

///
