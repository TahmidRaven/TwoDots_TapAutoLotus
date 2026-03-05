import { Node, Vec3 } from 'cc';
import { GridPiece } from './GridPiece';

export interface MatchLink {
    origin: Vec3;
    target: Node;
}

export class MatchFinder {
    /**
     * BFS search to create a chain-link structure of matches.
     * This ensures dot A connects to dot B, and dot B connects to dot C.
     */
    public static getChainMatches(r: number, c: number, colorId: string, grid: (Node | null)[][], rows: number, cols: number): MatchLink[] {
        const links: MatchLink[] = [];
        const visited = new Set<string>();
        const queue: { r: number, c: number, pos: Vec3 }[] = [];

        const startNode = grid[r][c];
        if (!startNode) return [];

        // Mark the starting cell (lotus position) as visited
        visited.add(`${r},${c}`);
        queue.push({ r, c, pos: startNode.position.clone() });

        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]]; // Right, Left, Down, Up

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
                        // Match if same color
                        if (p && p.colorId === colorId) {
                            visited.add(key);
                            
                            // Create a link from the "parent" node to this neighbor
                            links.push({ 
                                origin: current.pos.clone(), 
                                target: neighbor 
                            });

                            // Add neighbor to queue to find its own neighbors (the chain continues)
                            queue.push({ r: nr, c: nc, pos: neighbor.position.clone() });
                        }
                    }
                }
            }
        }
        return links;
    }
}