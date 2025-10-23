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

    // Extract original study from first replication record
    const original = {
      authors: meta.replications[0].author_o.map(a => `${a.given} ${a.family}`).join(", "),
      title: meta.replications[0].title_o,
      journal: meta.replications[0].journal_o,
      year: meta.replications[0].year_o,
      doi: meta.replications[0].doi_o
    };

    // Extract replications
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
        if (r.outcome in counts) counts[r.outcome]++;
    });

    const summaryText = `${replications.length} replications found: ${counts.success} ✅ success, ${counts.failure} ❌ failure, ${counts.mixed} ⚠️ mixed`;

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


function getOutcomeIcon(outcome) {
    switch (outcome) {
        case "success":
            return '<img src="icons/correct.png" alt="Success" width="20">';
        case "failure":
            return '<img src="icons/failure.png" alt="Failure" width="20">';
        case "mixed":
            return "⚠️";
        case "na":
            return 'NA';
        default:
            return "NA";
    }
}


function showFallback(doi) {
    fallbackBox.innerHTML = `
    <p>No record found. <a href="https://docs.google.com/forms/d/e/1FAIpQLSeMCwdtP0TPgL55stniuyyTxnNwyC34mO4VUuLcQwYrLI89sQ/viewform?usp=pp_url&entry.1234567890=${encodeURIComponent(doi)}" target="_blank">Suggest a new replication</a></p>
  `;
    fallbackBox.style.display = "block";
}














// // // Mock test


// async function fetchData(doi) {
//     summaryBox.innerHTML = "";
//     resultBox.innerHTML = "";
//     fallbackBox.style.display = "none";

//     // ✅ Mock block goes here
//     if (doi === "10.5555/mockdoi") {
//         const mockData = {
//             original: {
//                 authors: "Marsh, John E.; Vachon, François; Jones, Dylan M.",
//                 title: "When does between-sequence phonological similarity promote irrelevant sound disruption?",
//                 journal: "Journal of Experimental Psychology: Learning, Memory, and Cognition",
//                 year: "2008",
//                 doi: "10.5555/mockdoi",
//                 url: "https://doi.org/10.5555/mockdoi"
//             },
//             replications: [
//                 {
//                     authors: "Smith, Alice; Kumar, Rishabh",
//                     title: "Revisiting phonological similarity effects in auditory distraction",
//                     journal: "Memory & Cognition",
//                     year: "2015",
//                     doi: "10.5555/rep1",
//                     url: "https://doi.org/10.5555/rep1",
//                     outcome: "success",
//                     replication_type: "Direct"
//                 },
//                 {
//                     authors: "Chen, Li; Patel, Anika",
//                     title: "Phonological interference in working memory tasks",
//                     journal: "Cognitive Psychology",
//                     year: "2017",
//                     doi: "10.5555/rep2",
//                     url: "https://doi.org/10.5555/rep2",
//                     outcome: "failure",
//                     replication_type: "Conceptual"
//                 },
//                 {
//                     authors: "Garcia, Miguel; Tanaka, Hiroshi",
//                     title: "Auditory distraction and memory retention: A replication study",
//                     journal: "Psychological Bulletin",
//                     year: "2020",
//                     doi: "10.5555/rep3",
//                     url: "https://doi.org/10.5555/rep3",
//                     outcome: "mixed",
//                     replication_type: "Partial"
//                 }
//             ]
//         };

//         renderOriginal(mockData.original);
//         renderReplications(mockData.replications, mockData.original.doi);
//         return;
//     }

//     // ...rest of your fetch logic
// }
