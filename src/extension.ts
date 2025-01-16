import * as vscode from 'vscode';
import { FileExplorerProvider, JupyterContentProvider } from './FileExplorer';

export function activate(context: vscode.ExtensionContext) {
    const fileExplorerProvider = new FileExplorerProvider();
    const jupyterContentProvider = new JupyterContentProvider(fileExplorerProvider);

    vscode.window.createTreeView('jupyterFileExplorer', { treeDataProvider: fileExplorerProvider });

    let connectDisposable = vscode.commands.registerCommand('extension.connectJupyter', async () => {
        const config = vscode.workspace.getConfiguration('jupyterFileExplorer');
        const defaultUrl = config.get<string>('defaultServerUrl') || '';
        const defaultToken = config.get<string>('defaultToken') || '';
        const defaultRemotePath = config.get<string>('defaultRemotePath') || './';

        const url: string | undefined = await vscode.window.showInputBox({ 
            prompt: 'Enter Jupyter Server URL',
            value: defaultUrl,
            placeHolder: 'https://example.com/jupyter'
        });
        const token: string | undefined = await vscode.window.showInputBox({ 
            prompt: 'Enter Jupyter Token', 
            ignoreFocusOut: true, 
            password: true, 
            value: defaultToken
        });
        const remotePath: string | undefined = await vscode.window.showInputBox({ 
            prompt: 'Enter Remote Path (leave empty for root)', 
            value: defaultRemotePath
        });

        if (url && token) {
            await fileExplorerProvider.setConnection(url, token, remotePath || '/');
            const axiosInstance = fileExplorerProvider.getAxiosInstance();
            if (axiosInstance) {
                jupyterContentProvider.setAxiosInstance(axiosInstance);
                vscode.window.showInformationMessage('Connected to Jupyter Server.');
            } else {
                vscode.window.showErrorMessage('Failed to create Axios instance.');
            }
        } else {
            vscode.window.showErrorMessage('Jupyter Server URL and Token are required.');
        }
    });

    vscode.commands.registerCommand('extension.refreshJupyterFiles', () => {
        fileExplorerProvider.refresh();
    });

    let openFileDisposable = vscode.commands.registerCommand('jupyterFileExplorer.openFile', (filePath: string) => {
        fileExplorerProvider.openFile(filePath);
    });

    // Register the FileSystemProvider
    context.subscriptions.push(vscode.workspace.registerFileSystemProvider('jupyter-remote', fileExplorerProvider, { 
        isCaseSensitive: true
    }));

    context.subscriptions.push(connectDisposable, openFileDisposable);
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('jupyter-remote', jupyterContentProvider));
}

export function deactivate() {}
