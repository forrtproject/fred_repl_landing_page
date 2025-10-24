import type { Component } from 'solid-js';
import { MarkdownToHtml } from '../../utils/markdown';

export const TypographyDemo: Component = () => {
  const sampleReferences = [
    "Smith, J. A., & Johnson, M. B. (2023). Replication attempts in psychological science. *Journal of Experimental Psychology*, 149(2), 123-145. https://doi.org/10.1037/xge0001234",
    "Brown, L., Wilson, K., & Davis, R. (2022). **Open science practices** in *Nature Human Behaviour*. Retrieved from https://example.com",
    "Taylor, S. (2021). Meta-analysis of replication studies. *Psychological Science*, 32(8), 1123-1135.",
    "Anderson, P., et al. (2020). Cross-cultural replication findings. *Current Biology*, 30(15), R789-R801."
  ];

  return (
    <div class="hero bg-base-200 min-h-[68vh]">
      <div class="hero-content text-left max-w-4xl">
        <div>
          <h1 class="text-4xl font-bold mb-6">Typography & Reference Styling Demo</h1>
          
          <div class="space-y-6">
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <h2 class="card-title text-xl">Font Family</h2>
                <p class="academic-text">
                  This page now uses <strong>EB Garamond</strong> as the primary font, 
                  which is similar to Century Schoolbook and provides excellent readability 
                  for academic content, matching the style used on forrt.org.
                </p>
              </div>
            </div>

            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <h2 class="card-title text-xl">Reference Styling Examples</h2>
                <div class="space-y-4">
                  {sampleReferences.map((ref) => (
                    <div class="border-l-4 border-blue-200 pl-4">
                      <p class="text-sm academic-text reference">
                        <MarkdownToHtml text={ref} />
                      </p>
                    </div>
                  ))}
                </div>
                <div class="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h3 class="font-semibold text-sm mb-2">Styling Notes:</h3>
                  <ul class="text-sm space-y-1">
                    <li>• Journal names (in *italics*) are now properly italicized, not bold</li>
                    <li>• Author names and other **bold** text remain bold</li>
                    <li>• Links are styled with secondary color and open in new tabs</li>
                    <li>• Typography follows academic citation standards</li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <h2 class="card-title text-xl">Markdown Conversion</h2>
                <div class="overflow-x-auto">
                  <table class="table table-zebra text-sm">
                    <thead>
                      <tr>
                        <th>Markdown</th>
                        <th>Renders As</th>
                        <th>Usage</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><code>*Journal Name*</code></td>
                        <td class="academic-text reference"><MarkdownToHtml text="*Journal Name*" /></td>
                        <td>Journal names (italics)</td>
                      </tr>
                      <tr>
                        <td><code>**Author Name**</code></td>
                        <td class="academic-text reference"><MarkdownToHtml text="**Author Name**" /></td>
                        <td>Emphasis (bold)</td>
                      </tr>
                      <tr>
                        <td><code>[Link](https://example.com)</code></td>
                        <td class="academic-text reference"><MarkdownToHtml text="[Link](https://example.com)" /></td>
                        <td>External links</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};