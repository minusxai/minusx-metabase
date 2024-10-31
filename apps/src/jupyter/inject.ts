import { get } from 'lodash';
import { initWindowListener } from 'extension'

async function getJupyterApp() {
    if (window.hasOwnProperty('jupyterapp') && window['jupyterapp']) {
        return window['jupyterapp']
    }
    return new Promise((resolve, reject) => {
        let times = 0
        const interval = setInterval(() => {
            times++
            if (window.hasOwnProperty('jupyterapp') && window['jupyterapp']) {
                clearInterval(interval)
                resolve(window['jupyterapp'])
            } else if (times > 20) {
                clearInterval(interval)
                reject('Jupyter app not found')
            }
        }, 200)
    })
}

async function getActiveWidgets(mode?: string) {
    const jupyterapp = await getJupyterApp();
    const activeWidgets = [...jupyterapp.shell.widgets(mode || 'main')];
    return activeWidgets
}

async function getNotebookState(mode?: string) {
    const activeWidgets = await getActiveWidgets(mode);
    const notebooks = []
    for (const widget of activeWidgets) {
        const sessionContext = widget.sessionContext;
        if (!sessionContext) {
            continue
        }
        const kernel = sessionContext.session.kernel;
        const notebook = {
            cells: [],
            id: widget.id,
            title: widget.title.label,
            caption: widget.title.caption,
            isVisible: widget.isVisible,
            isUntitled: widget.isUntitled,
            kernel: {
                status: kernel.status,
                id: kernel.id
            }
        }
        const activeCellIndex = widget.content.activeCellIndex;
        widget.content.widgets.forEach((cell, index) => {
            const cellState = cell.model.toJSON();
            if (cellState.cell_type) {
                cellState.cellType = cellState.cell_type.toLowerCase();
                cellState.cellIndex = index;
                cellState.isDirty = cell.model.isDirty;
                cellState.isInViewport = cell._inViewport;
                cellState.isSelected = index === activeCellIndex;
                cellState.isExecuting = cell.inputArea.promptNode.textContent.includes('*');
                notebook.cells.push(cellState);
            }
        })
        notebooks.push(notebook)
    }
    return notebooks
}

async function getJupyterState(mode?: string) {
    const jupyterapp = await getJupyterApp();
    const jupyterState = {
        notebooks: await getNotebookState(mode),
        mode: jupyterapp.shell._dockPanel?.mode ?? 'single-document',
        name: jupyterapp.name,
        namespace: jupyterapp.namespace,
        version: jupyterapp.version,
    }
    return jupyterState;
}

async function getJupyterCodeOutput(code?: string, notebookId?: string, mode?: string) {
    const activeWidgets = await getActiveWidgets(mode);
    if (!notebookId) {
        notebookId = get(activeWidgets, '0.id');
    }
    const activeWidget = activeWidgets.find(widget => widget.id === notebookId);
    if (!activeWidget) {
        throw new Error('Notebook not found');
    }

    code = code || `
import json

# Capture the common default globals in Jupyter
_default_jupyter_globals = {
    'get_ipython', 'quit', 'exit', 'In', 'Out', 'display', 'open'
}

# After user code is run, we'll filter out built-ins and default Jupyter globals
_user_defined_vars = {}

for _var_name, _var_value in globals().items():
    if _var_name not in _default_jupyter_globals and _var_name.startswith('_') == False:
        _user_defined_vars[_var_name] = {
            "type": type(_var_value).__name__,
            "value": repr(_var_value)[:100]
        }

# Print as JSON
print(json.dumps(_user_defined_vars))`;

    return new Promise((resolve, reject) => {
        let resolved = false
        const future = activeWidget.sessionContext.session.kernel.requestExecute({ code });
        future.onIOPub = (msg) => {
            if (msg.header.msg_type === 'execute_result' || msg.header.msg_type === 'stream') {
                if (!resolved) {
                    resolved = true
                    return resolve(msg.content.text);  // The output will be in msg.content.text or msg.content.data
                }
            }
        };
        const endCallback = () => {
            if (!resolved) {
                resolved = true
                reject('No output received');
            }
        }
        future.done.then(endCallback).catch(endCallback);
    })
}

export const rpc = {
    getJupyterCodeOutput,
    getJupyterState
}

initWindowListener(rpc)