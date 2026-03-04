import { Node } from 'cc';
import { GridPiece } from './GridPiece';

export class MatchFinder {
    /**
     * Recursive search for same-colored neighbors
     */
    public static getAdjacentMatches(r: number, c: number, colorId: string, grid: (Node | null)[][], rows: number, cols: number): Node[] {
        const matches: Node[] = [];
        const visited = new Set<string>();
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]]; // Right, Left, Down, Up

        const find = (row: number, col: number) => {
            const key = `${row},${col}`;
            if (visited.has(key)) return;
            visited.add(key);

            directions.forEach(([dr, dc]) => {
                const nr = row + dr;
                const nc = col + dc;

                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                    const neighbor = grid[nr][nc];
                    if (neighbor) {
                        const p = neighbor.getComponent(GridPiece);
                        // Only match if same color and not the starting point
                        if (p && p.colorId === colorId && (nr !== r || nc !== c)) {
                            matches.push(neighbor);
                            find(nr, nc); 
                        }
                    }
                }
            });
        };
        find(r, c);
        return matches;
    }
}