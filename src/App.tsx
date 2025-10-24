import repResearch from '/forrt_text.svg'
import { Footer } from './components/Footer'
import forrt from './assets/FORRT.svg'
import { ReplicationSearchPanel } from './components/replication/ReplicationSearchPanel'
import { createSignal } from 'solid-js';
import type { DOIAPIResponse } from './@types';

function App() {
  const [doi, setDoi] = createSignal<DOIAPIResponse[] | null>(null);
  return (
    <div class="bg-neutral min-h-screen">
      <div class="navbar bg-neutral text-neutral-content shadow-sm">
        <div class="navbar-start">
          <div class="dropdown">
            <div tabindex="0" role="button" class="btn btn-ghost lg:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8m-8 6h16" /> </svg>
            </div>
            <ul
              tabindex="-1"
              class="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow">
              <li><a href="/">Home</a></li>
              <li><a href="https://forrt.org/about/us/" target="_blank">About</a></li>
              <li><a href="https://forrt.org/apps/fred_explorer.html">FReeD Explorer</a></li>
              <li><a href="#">Contact</a></li>
            </ul>
          </div>
          <a class="link text-xl" href='/'>
            <div class="avatar">
              <div class="w-10 rounded">
                <img src={forrt} alt="FORRT Logo" />
              </div>
              <div class="ml-2 font-bold flex flex-col max-h-10 w-34">
                <span class="text-sm">FReD</span>
                <span class="text-xs">Replication Hub</span>
              </div>
              
            </div>
          </a>
        </div>
        <div class="navbar-end">
          <div class="hidden lg:flex">
            <ul class="menu menu-horizontal px-1">
              <li><a href="/">Home</a></li>
              <li><a href="https://forrt.org/about/us/" target="_blank">About</a></li>
              <li><a href="https://forrt.org/apps/fred_explorer.html">FReeD Explorer</a></li>
              <li><a href="#">Contact</a></li>
            </ul>
          </div>
          <a class="btn btn-secondary">Contact Us</a>
        </div>
      </div>
      {
        doi() == null ? (
          <div class="hero bg-base-200 ">
            <div class="hero-content flex-col lg:flex-row">
              <div>
                <div class="flex w-64 shadow-sm">
                  <img
                    src={repResearch}
                    alt="Replication Research"
                    class="rounded-lg"
                  />
                </div>
                <h1 class="text-5xl font-bold">Replication Summary</h1>
                <p class="py-6">
                  Replication is essential to scientific progress. Use this tool to check whether a study has been replicated, explore the outcomes, and contribute to the growing ecosystem of reproducible research.
                  If you spot missing data or want to suggest a new replication, we welcome your input!
                </p>
              </div>
            </div>
          </div>
        ) : null
      }
      <div class="bg-base-200 min-h-[40vh] pb-8">
        <ReplicationSearchPanel onSuccess={dois => setDoi(dois)} />
      </div>    
      <Footer />
    </div>
  )
}

export default App
