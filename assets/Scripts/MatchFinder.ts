import { Node, Vec3 } from 'cc';
import { GridPiece } from './GridPiece';

export interface MatchLink {
    origin: Vec3;
    target: Node;
}

export class MatchFinder {
    /**
     * Scans the grid to find the first available valid move.
     * Returns the grid coordinates and position of a dot that has at least one matching neighbor.
     */
    public static findFirstValidMatch(grid: (Node | null)[][], rows: number, cols: number): { r: number, c: number, pos: Vec3 } | null {
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const node = grid[r][c];
                if (!node) continue;

                const piece = node.getComponent(GridPiece);
                if (!piece) continue;

                // Check neighbors (Right, Left, Down, Up)
                const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                for (const [dr, dc] of directions) {
                    const nr = r + dr;
                    const nc = c + dc;

                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                        const neighbor = grid[nr][nc];
                        if (neighbor) {
                            const neighborPiece = neighbor.getComponent(GridPiece);
                            // If a neighbor shares the same color, this is a valid tap point
                            if (neighborPiece && neighborPiece.colorId === piece.colorId) {
                                return { r, c, pos: node.position.clone() };
                            }
                        }
                    }
                }
            }
        }
        return null;
    }

    /**
     * BFS search to create a chain-link structure of matches.
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