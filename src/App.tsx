import { createSignal } from 'solid-js'
import forrtLogo from './assets/forrt.svg'
import './App.css'

function App() {
  const [count, setCount] = createSignal(0)

  return (
    <>
      <div>
        <img src={forrtLogo} class="logo" alt="Forrt logo" />
      </div>
      <h1>Replication Summary Landing Page</h1>
      <div class="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count()}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
    </>
  )
}

export default App
