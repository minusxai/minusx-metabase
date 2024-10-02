import _ from 'lodash';
import { DOMQuery } from 'extension/types';
import { RPCs } from 'web';

const { getJupyterState } = RPCs;

type JupyterCellType = 'code' | 'markdown'
// ToDo: Currently plots/images are not handled. We do not store/send plot outputs to the LLM
type JupyterCellOutputType = 'text' | 'plot' | 'dataframe' | 'error' | 'other'
type JupyterNotebookType = 'lab' | 'notebook' | 'lite' | 'other'

interface JupyterCellOutput {
  type: JupyterCellOutputType
  value: string
}

interface JupyterCellState {
  source: string
  isSelected: boolean
  output: JupyterCellOutput[]
  isInViewport: boolean
  isExecuting: boolean
  cellType: JupyterCellType
  cellIndex: number
}

const visibleTabSelectorXPATH = '//div[(@role="tabpanel" and not(contains(@class,"lm-mod-hidden"))) or @id="main-split-panel"]'

export const wholeCellOutput: DOMQuery = {
  selector: {
    type: 'XPATH',
    selector: `${visibleTabSelectorXPATH}//div[starts-with(@aria-label, "Code Cell Content") or starts-with(@aria-label, "Markdown Cell Content")]`
  },
  children: {
    cellContent: {
      selector: {
        type: 'XPATH',
        selector:
          `.//div[@role="textbox"]`,
      },
      children: {
        source: {
          selector: {
            type: 'XPATH',
            selector: ".//div[@class='cm-line' or @class='CodeMirror-line']"
          },
          attrs: ['text']
        }
      }
    },
    inputAreaPrompt: {
      selector: {
        type: 'CSS',
        selector: 'div.jp-InputArea-prompt'
      }
    },
    outputArea: {
      selector: {
        type: 'CSS',
        selector: '.jp-OutputArea-output'
      },
      children: {
        // plotlyImg: {
        //   selector: {
        //     type: 'CSS',
        //     selector: '.plot-img'
        //   },
        //   attrs: ['src']
        // },
        text: {
          selector: {
            type: 'CSS',
            selector: '.jp-OutputArea-output pre'
          },
          attrs: ['text']
        },
        dataframe: {
          selector: {
            type: 'CSS',
            selector: 'table.dataframe'
          },
          children: {
            rows: {
              selector: {
                type: 'CSS',
                selector: 'tr',
              },
              children: {
                cell: {
                  selector: {
                    type: 'CSS',
                    selector: 'th, td',
                  },
                  attrs: ['text']
                }
              }
            }
          }
        }
      }
    },
  }
}

export interface JupyterNotebookState {
  cells: JupyterCellState[],
  notebookType: JupyterNotebookType
}

const getNotebookType = (jupyterState: any): JupyterNotebookType => {
  if (jupyterState.namespace === 'lab') {
    return 'lab'
  } else if (jupyterState.namespace === "JupyterLite") {
    return 'lite'
  } else if ((jupyterState.mode === 'single-document')) {
    return 'notebook'
  } else {
    return 'other'
  }
}

export async function convertDOMtoState(): Promise<JupyterNotebookState> {
  const jupyterState = await getJupyterState()
  const currentNotebook = jupyterState.notebooks.filter(nb => nb.isVisible)[0]
  if (!currentNotebook) {
    return {
      notebookType: 'other',
      cells: []
    }
  }
  const notebookState: JupyterNotebookState = {
    notebookType: getNotebookType(jupyterState),
    cells: [],
  };

  currentNotebook.cells.forEach(cell => {
    const output = processCellOutput(cell.outputs || [])
    // Use only code cell for context, to get around the invisible markdown issue in lab/notebook
    if (cell.cell_type === 'code') {
      notebookState.cells.push({
        source: cell.source,
        isSelected: cell.isSelected,
        isInViewport: cell.isInViewport,
        isExecuting: cell.isExecuting,
        cellType: cell.cellType,
        cellIndex: notebookState.cells.length,
        output,
      })
    }
  })

  return notebookState
}

function htmlToMarkdown(html: string): string | undefined {
  // Create a DOM parser to parse the HTML string
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Get the table from the parsed document
  const table = doc.querySelector('table');
  if (!table) {
      return undefined;
  }

  // Extract headers
  const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent?.trim() || '');
  if (headers.length === 0) {
      return undefined;
  }

  // Construct the markdown header row
  let markdown = `| ${headers.join(' | ')} |\n`;
  markdown += `| ${headers.map(() => '---').join(' | ')} |\n`;

  // Extract rows from the table body
  const rows = table.querySelectorAll('tbody tr');
  if (rows.length === 0) {
      return undefined;
  }

  let totalChars = markdown.length;
  const charLimit = 2500;
  const cellLimit = 500;

  rows.forEach(row => {
      if (totalChars >= charLimit) return;

      const cols = Array.from(row.querySelectorAll('td, th')).map(td => {
          const text = td.textContent?.trim() || '';
          return text.length > cellLimit ? text.substring(0, cellLimit) + '...' : text;
      });

      const rowMarkdown = `| ${cols.join(' | ')} |\n`;
      if (totalChars + rowMarkdown.length <= charLimit) {
          markdown += rowMarkdown;
          totalChars += rowMarkdown.length;
      } else {
          markdown += rowMarkdown.substring(0, charLimit - totalChars) + '...';
          totalChars = charLimit;  // Ensure no further processing
      }
  });

  return markdown;
}

export function processCellOutput(rawOutputs: any): JupyterCellOutput[] {
  const outputs: JupyterCellOutput[] = []
  if (rawOutputs.length == 0) {
    return outputs
  }
  rawOutputs.forEach((rawOutput: any) => {
    if (rawOutput.output_type == 'stream') {
      outputs.push({
        type: 'text',
        value: rawOutput.text
      })
    } else if (rawOutput.output_type == 'error') {
      outputs.push({
        type: 'error',
        value: rawOutput.traceback.join('\n')
      })
    } else if ((rawOutput.output_type == 'execute_result') && (rawOutput.data['text/html'])) {
      if (rawOutput.data['text/html'].includes('dataframe')) {
        const tableHtml = rawOutput.data['text/html'] || ""
        let parsedTable = htmlToMarkdown(tableHtml)
        if (parsedTable) {
          outputs.push({
            type: 'dataframe',
            value: parsedTable
          })
        } else {
          const TOP_N = 5
          const tableText = rawOutput.data['text/plain'].split('\n').slice(0, TOP_N).join('\n')
          outputs.push({
            type: 'dataframe',
            value: tableText
          })
        }
      }
    } else if ((rawOutput.output_type == 'execute_result') && (rawOutput.data['text/plain'])) {
      outputs.push({
        type: 'text',
        value: rawOutput.data['text/plain']
      })
    } else if (rawOutput.output_type == 'display_data') {
      if (rawOutput.data['image/png']) {
        outputs.push({
          type: 'plot',
          value: 'exists'
        })
      }
    }
  })
  // trim down each of the outputs to the first 10k characters. add a ellipsis if the output is longer than 10k
  outputs.forEach(output => {
    output.value = output.value.length > 10000 ? output.value.substring(0, 10000) + '...' : output.value
  })
  return outputs
}