// Minimal, safe Markdown renderer (no dangerouslySetInnerHTML, no deps).
// Supports: headings, bold, italic, inline code, bullet/numbered lists,
// blockquotes, horizontal rules and GitHub-style tables.
import { Fragment } from 'react'

function renderInline(text, keyBase) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_)/g).filter(Boolean)
  return parts.map((part, i) => {
    const key = `${keyBase}-${i}`
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={key}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={key} className="ai-code">{part.slice(1, -1)}</code>
    if (part.startsWith('_') && part.endsWith('_')) return <em key={key}>{part.slice(1, -1)}</em>
    return <Fragment key={key}>{part}</Fragment>
  })
}

const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())

export default function Markdown({ text = '' }) {
  const lines = text.split('\n')
  const blocks = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // table: a header row followed by a |---| separator
    if (line.trim().startsWith('|') && lines[i + 1] && /^\s*\|?[\s:-]+\|[\s:|-]*$/.test(lines[i + 1])) {
      const header = cells(line)
      const rows = []
      i += 2
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(cells(lines[i])); i++ }
      blocks.push(
        <div className="ai-table-wrap" key={`t${i}`}>
          <table className="ai-table">
            <thead><tr>{header.map((h, hi) => <th key={hi}>{renderInline(h, `th${i}-${hi}`)}</th>)}</tr></thead>
            <tbody>{rows.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci}>{renderInline(c, `td${i}-${ri}-${ci}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      )
      continue
    }

    if (/^###\s+/.test(line)) { blocks.push(<h4 key={i} className="ai-h">{renderInline(line.replace(/^###\s+/, ''), `h${i}`)}</h4>); i++; continue }
    if (/^##\s+/.test(line)) { blocks.push(<h3 key={i} className="ai-h">{renderInline(line.replace(/^##\s+/, ''), `h${i}`)}</h3>); i++; continue }

    if (line.trim() === '---') { blocks.push(<hr key={i} className="ai-hr" />); i++; continue }

    if (line.trim().startsWith('>')) {
      blocks.push(<blockquote key={i} className="ai-quote">{renderInline(line.replace(/^\s*>\s?/, ''), `q${i}`)}</blockquote>)
      i++; continue
    }

    // unordered list
    if (/^\s*-\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*-\s+/, '')); i++ }
      blocks.push(<ul key={`u${i}`} className="ai-list">{items.map((it, idx) => <li key={idx}>{renderInline(it, `li${i}-${idx}`)}</li>)}</ul>)
      continue
    }

    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+\.\s+/, '')); i++ }
      blocks.push(<ol key={`o${i}`} className="ai-list">{items.map((it, idx) => <li key={idx}>{renderInline(it, `oi${i}-${idx}`)}</li>)}</ol>)
      continue
    }

    if (line.trim() === '') { i++; continue }

    blocks.push(<p key={i} className="ai-p">{renderInline(line, `p${i}`)}</p>)
    i++
  }

  return <div className="ai-md">{blocks}</div>
}
