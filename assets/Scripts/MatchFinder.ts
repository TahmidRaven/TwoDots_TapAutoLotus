import { Node, Vec3 } from 'cc';
import { GridPiece } from './GridPiece';

export interface MatchLink {
    origin: Vec3;
    target: Node;
}

export class MatchFinder {
    private static _isFirstHint: boolean = true;


    public static findFirstValidMatch(grid: (Node | null)[][], rows: number, cols: number): { r: number, c: number, pos: Vec3 } | null {
        let bestMatch: { r: number, c: number, pos: Vec3, count: number } | null = null;

        // Special Case: First Hand Suggestion (Center [4,4])
        if (this._isFirstHint) {
            this._isFirstHint = false;
            const centerR = 4;
            const centerC = 4;
            
            // center and its immediate neighbors to see if [4,4] is part of a valid match
            const centerNode = grid[centerR][centerC];
            if (centerNode) {
                const piece = centerNode.getComponent(GridPiece);
                if (piece) {
                    const links = this.getChainMatches(centerR, centerC, piece.colorId, grid, rows, cols);
                    if (links.length > 0) {
                        return { r: centerR, c: centerC, pos: centerNode.position.clone() };
                    }
                }
            }
        }

        // General Case: Prioritize larger connection suggestions
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const node = grid[r][c];
                if (!node) continue;

                const piece = node.getComponent(GridPiece);
                if (!piece) continue;

                // Get the chain length for this specific dot
                const links = this.getChainMatches(r, c, piece.colorId, grid, rows, cols);
                
                // If this match is bigger than our current "best", store it
                if (links.length > 0) {
                    if (!bestMatch || links.length > bestMatch.count) {
                        bestMatch = {
                            r,
                            c,
                            pos: node.position.clone(),
                            count: links.length
                        };
                    }
                }
            }
        }

        return bestMatch ? { r: bestMatch.r, c: bestMatch.c, pos: bestMatch.pos } : null;
    }

    /**
     * my NIggA added BFS search to create a chain-link structure
     */
    public static getChainMatches(r: number, c: number, colorId: string, grid: (Node | null)[][], rows: number, cols: number): MatchLink[] {
        const links: MatchLink[] = [];
        const visited = new Set<string>();
        const queue: { r: number, c: number, pos: Vec3 }[] = [];

        const startNode = grid[r][c];
        if (!startNode) return [];

        visited.add(`${r},${c}`);
        queue.push({ r, c, pos: startNode.position.clone() });

        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        while (queue.length > 0) {
            const current = queue.shift()!;

            for (const [dr, dc] of directions) {
                const nr = current.r + dr;
                const nc = current.c + dc;
                const key = `${nr},${nc}`;

                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited.has(key)) {
                    const neighbor = grid[nr][nc];
                    if (neighbor) {
                        const p = neighbor.getComponent(GridPiece);
                        if (p && p.colorId === colorId) {
                            visited.add(key);
                            links.push({ 
                                origin: current.pos.clone(), 
                                target: neighbor 
                            });
                            queue.push({ r: nr, c: nc, pos: neighbor.position.clone() });
                        }
                    }
                }
            }
        }
        return links;
    }
}