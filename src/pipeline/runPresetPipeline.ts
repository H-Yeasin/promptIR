import { processPromptWithAI } from '../ai/aiEngine';
import { getPromptAwareWorkspaceContext, WorkspaceContext } from '../context/contextGatherer';
import { GraphifyDriver, type GraphifyRelationshipMap } from '../graphifyDriver';
import { getPromptForPreset, PromptPreset } from '../presets/promptPresets';
import type { PromptProcessingOptions } from '../ai/aiEngine';

const graphifyDriver = new GraphifyDriver();
const MAX_SEMANTIC_ANCHOR_FILES = 3;

export async function runPresetPipeline(
	prompt: string,
	workspaceContext: WorkspaceContext,
	preset: PromptPreset,
	options: PromptProcessingOptions = {}
): Promise<string> {
	const rawPrompt = getPromptForPreset(prompt, preset);

	if (preset.requiresPrompt && !rawPrompt.trim()) {
		throw new Error(`${preset.label} needs input before PromptIR can continue.`);
	}

	options.onStatus?.('Preparing Graphify relationship index...');
	await graphifyDriver.ensureGraphIndex().catch((error: unknown) => {
		console.error('PromptIR: Graphify index preparation failed.', error);
		return false;
	});
	options.onStatus?.('Gathering files, Graphify relationships, and diagnostics...');

	const promptAwareContext = await getPromptAwareWorkspaceContext(
		rawPrompt.trim(),
		workspaceContext,
		preset.contextStrategy
	);

	const anchorFileNames = buildAnchorFileNames(
		workspaceContext.fileName,
		promptAwareContext.promptReferencedFileNames,
		promptAwareContext.semanticHitFiles
	);
	const graphifyContext = await getGraphifyContextForAnchors(anchorFileNames);

	return processPromptWithAI(
		rawPrompt.trim(),
		{ ...promptAwareContext, graphifyContext },
		preset,
		options
	);
}

export function buildAnchorFileNames(
	activeFileName: string,
	referencedFileNames: string[] = [],
	semanticHitFiles: string[] = []
): string[] {
	return Array.from(new Set([
		activeFileName,
		...referencedFileNames,
		...semanticHitFiles.slice(0, MAX_SEMANTIC_ANCHOR_FILES)
	]));
}

async function getGraphifyContextForAnchors(anchorFileNames: string[]): Promise<string | undefined> {
	try {
		const installed = await graphifyDriver.checkInstallation();

		if (!installed) {
			return undefined;
		}

		const maps: GraphifyRelationshipMap[] = [];

		for (const anchor of anchorFileNames) {
			const map = await graphifyDriver.getRelatedContext(anchor);

			if (map) {
				maps.push(map);
			}
		}

		if (!maps.length) {
			return undefined;
		}

		return maps.length === 1 ? formatGraphifyRelationshipMap(maps[0]) : formatGraphifyRelationshipMaps(maps);
	} catch {
		return undefined;
	}
}

function formatGraphifyRelationshipMap(map: GraphifyRelationshipMap): string {
	return [
		'[GRAPHIFY RELATIONSHIP MAP]',
		`Active file: ${map.activeFile}`,
		`Cluster: ${map.cluster ?? 'unknown'}`,
		`Degree score: ${map.degree}`,
		'',
		'Upstream dependencies:',
		...formatGraphifyNodes(map.upstream),
		'',
		'Downstream dependents:',
		...formatGraphifyNodes(map.downstream),
		'',
		'Connected edges:',
		...formatGraphifyEdges(map.edges),
		'[/GRAPHIFY RELATIONSHIP MAP]'
	].join('\n');
}

function formatGraphifyRelationshipMaps(maps: GraphifyRelationshipMap[]): string {
	const upstream = dedupeGraphifyNodes(maps.flatMap(map => map.upstream));
	const downstream = dedupeGraphifyNodes(maps.flatMap(map => map.downstream));
	const edges = dedupeGraphifyEdges(maps.flatMap(map => map.edges));

	return [
		'[GRAPHIFY RELATIONSHIP MAP]',
		`Anchor files: ${maps.map(map => map.activeFile).join(', ')}`,
		'',
		'Upstream dependencies:',
		...formatGraphifyNodes(upstream),
		'',
		'Downstream dependents:',
		...formatGraphifyNodes(downstream),
		'',
		'Connected edges:',
		...formatGraphifyEdges(edges),
		'[/GRAPHIFY RELATIONSHIP MAP]'
	].join('\n');
}

function formatGraphifyNodes(nodes: GraphifyRelationshipMap['upstream']): string[] {
	if (!nodes.length) {
		return ['- none'];
	}

	return nodes.map(node => `- ${node.fileName} (cluster: ${node.cluster ?? 'unknown'}, degree: ${node.degree})`);
}

function formatGraphifyEdges(edges: GraphifyRelationshipMap['edges']): string[] {
	if (!edges.length) {
		return ['- none'];
	}

	return edges.map(edge => `- ${edge.source} -> ${edge.target}${edge.type ? ` (${edge.type})` : ''}`);
}

function dedupeGraphifyNodes(nodes: GraphifyRelationshipMap['upstream']): GraphifyRelationshipMap['upstream'] {
	const byId = new Map<string, GraphifyRelationshipMap['upstream'][number]>();

	for (const node of nodes) {
		if (!byId.has(node.id)) {
			byId.set(node.id, node);
		}
	}

	return Array.from(byId.values());
}

function dedupeGraphifyEdges(edges: GraphifyRelationshipMap['edges']): GraphifyRelationshipMap['edges'] {
	const byKey = new Map<string, GraphifyRelationshipMap['edges'][number]>();

	for (const edge of edges) {
		const key = `${edge.source}|${edge.target}|${edge.type ?? ''}`;

		if (!byKey.has(key)) {
			byKey.set(key, edge);
		}
	}

	return Array.from(byKey.values());
}
