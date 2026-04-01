/**
 * Text insertion utilities for content scripts.
 *
 * Used when the extension needs to insert text into
 * focused input fields or content-editable areas.
 */

/**
 * Inserts `text` at the current cursor position in any focused
 * `<input>`, `<textarea>`, or `contenteditable` element.
 *
 * Returns `true` on success, `false` if no suitable target is focused.
 */
export function insertAtCursor(text: string): boolean {
  const el = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null

  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? el.value.length
    el.value = el.value.slice(0, start) + text + el.value.slice(end)
    el.selectionStart = el.selectionEnd = start + text.length
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  }

  // contenteditable (e.g. Google Docs, Notion)
  const selection = window.getSelection()
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0)
    const node = range.startContainer
    if (
      node.nodeType === Node.TEXT_NODE
      || (node as Element).isContentEditable
    ) {
      range.deleteContents()
      range.insertNode(document.createTextNode(text))
      range.collapse(false)
      selection.removeAllRanges()
      selection.addRange(range)
      return true
    }
  }

  return false
}

/**
 * Fallback clipboard-based insertion.
 *
 * Copies `text` to clipboard then fires a `paste` command.
 * Works in most content-editable fields including Google Docs.
 */
export async function insertViaClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    document.execCommand('paste')
    return true
  }
  catch {
    return false
  }
}

/**
 * Tries `insertAtCursor` first, falls back to `insertViaClipboard`.
 */
export async function smartInsert(text: string): Promise<boolean> {
  if (insertAtCursor(text))
    return true
  return insertViaClipboard(text)
}
