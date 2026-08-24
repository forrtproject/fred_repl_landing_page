/* @refresh reload */
import { render } from 'solid-js/web'
import { Router, Route } from '@solidjs/router'
import './index.css'
import App from './App'
import { DoiPage } from './components/pages/DoiPage'

const base = import.meta.env.BASE_URL

const root = document.getElementById('root')

// index.html ships a crawlable static copy of the page inside #root for clients
// that never run this script. Solid appends rather than replaces, so clear it.
if (root) root.textContent = ''

render(
  () => (
    <Router base={base.endsWith('/') ? base.slice(0, -1) : base}>
      <Route path="/" component={App} />
      <Route path="/doi/*doi" component={DoiPage} />
    </Router>
  ),
  root!
)
