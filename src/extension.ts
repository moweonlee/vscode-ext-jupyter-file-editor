import * as vscode from 'vscode';
import { FileExplorerProvider, JupyterContentProvider } from './FileExplorer';

export async function activate(context: vscode.ExtensionContext) {
    const fileExplorerProvider = new FileExplorerProvider();
    const jupyterContentProvider = new JupyterContentProvider(fileExplorerProvider);

    vscode.window.createTreeView('jupyterFileExplorer', { treeDataProvider: fileExplorerProvider });

    let connectDisposable = vscode.commands.registerCommand('extension.connectJupyter', async () => {
        await connectToJupyter(fileExplorerProvider, jupyterContentProvider);
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

    // Automatically attempt to connect to Jupyter on activation
    await connectToJupyter(fileExplorerProvider, jupyterContentProvider);
}

async function connectToJupyter(fileExplorerProvider: FileExplorerProvider, jupyterContentProvider: JupyterContentProvider) {
    const config = vscode.workspace.getConfiguration('jupyterFileExplorer');
    const defaultUrl = config.get<string>('defaultServerUrl') || '';
    const defaultToken = config.get<string>('defaultToken') || '';
    const defaultRemotePath = config.get<string>('defaultRemotePath') || './';

    let url = defaultUrl;
    let token = defaultToken;
    let remotePath = defaultRemotePath;

    if (!defaultUrl) {
        url = await vscode.window.showInputBox({ 
            prompt: 'Enter Jupyter Server URL',
            value: defaultUrl,
            placeHolder: 'https://example.com/jupyter'
        }) || '';
    }

    if (!defaultToken) {
        token = await vscode.window.showInputBox({ 
            prompt: 'Enter Jupyter Token', 
            ignoreFocusOut: true, 
            password: true, 
            value: defaultToken
        }) || '';
    }

    if (!defaultRemotePath) {
        remotePath = await vscode.window.showInputBox({ 
            prompt: 'Enter Remote Path (leave empty for root)', 
            value: defaultRemotePath
        }) || './';
    }

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
}

export function deactivate() {}
