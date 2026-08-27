/* @refresh reload */
import { render } from 'solid-js/web'
import { Router, Route } from '@solidjs/router'
import './index.css'
import App from './App'
import { DoiPage } from './components/pages/DoiPage'

const base = import.meta.env.BASE_URL

const root = document.getElementById('root')

// #root ships a crawlable static copy; Solid appends rather than replaces it.
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
