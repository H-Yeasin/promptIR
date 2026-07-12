export interface ContextFile {
	fileName: string;
	languageId: string;
	text: string;
	score: number;
}

export interface ContextDiagnostic {
	fileName: string;
	line: number;
	column: number;
	severity: string;
	message: string;
	source?: string;
}

export interface WorkspaceContext {
	fileName: string;
	languageId: string;
	selectedText: string;
	promptReferencedFileName?: string;
	promptReferencedFileNames?: string[];
	graphifyContext?: string;
	relatedFiles?: ContextFile[];
	diagnostics?: ContextDiagnostic[];
	semanticHitFiles?: string[];
}
