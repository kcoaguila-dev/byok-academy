import React, { useMemo } from 'react';
import type { Course, Concept } from '../types';

interface ConceptGraphProps {
  course: Course;
  activeConcept: Concept | null;
  onSelectConcept: (concept: Concept) => void;
}

interface NodeLayout {
  id: string;
  concept: Concept;
  level: number;
  x: number;
  y: number;
  isLocked: boolean;
}

export const ConceptGraph: React.FC<ConceptGraphProps> = ({ course, activeConcept, onSelectConcept }) => {
  const { nodes, links, width, height, viewBox } = useMemo(() => {
    // Determine level for each node
    const levels = new Map<string, number>();
    const conceptMap = new Map<string, Concept>();

    course.concepts.forEach(c => conceptMap.set(c.id, c));

    // Calculate level (depth)
    const getLevel = (id: string, visited = new Set<string>()): number => {
      if (visited.has(id)) return 0; // prevent cycle
      if (levels.has(id)) return levels.get(id)!;

      const concept = conceptMap.get(id);
      if (!concept || !concept.prerequisites || concept.prerequisites.length === 0) {
        levels.set(id, 0);
        return 0;
      }

      visited.add(id);
      let maxPrereqLevel = -1;
      concept.prerequisites.forEach(prereqId => {
        maxPrereqLevel = Math.max(maxPrereqLevel, getLevel(prereqId, new Set(visited)));
      });
      visited.delete(id);

      const level = maxPrereqLevel + 1;
      levels.set(id, level);
      return level;
    };

    course.concepts.forEach(c => getLevel(c.id));

    // Group nodes by level
    const nodesByLevel: Record<number, Concept[]> = {};
    let maxLevel = 0;

    course.concepts.forEach(c => {
      const level = levels.get(c.id) || 0;
      maxLevel = Math.max(maxLevel, level);
      if (!nodesByLevel[level]) nodesByLevel[level] = [];
      nodesByLevel[level].push(c);
    });

    const NODE_WIDTH = 180;
    const NODE_HEIGHT = 40;
    const X_SPACING = 220;
    const Y_SPACING = 80;

    // Calculate max nodes in any level to determine width
    let maxNodesInLevel = 0;
    Object.values(nodesByLevel).forEach(levelNodes => {
      maxNodesInLevel = Math.max(maxNodesInLevel, levelNodes.length);
    });

    const totalWidth = Math.max(800, maxNodesInLevel * X_SPACING);
    const totalHeight = Math.max(400, (maxLevel + 1) * Y_SPACING + 100);

    const layoutNodes: NodeLayout[] = [];

    // Assign positions
    Object.entries(nodesByLevel).forEach(([levelStr, levelNodes]) => {
      const level = parseInt(levelStr);
      const startX = (totalWidth - (levelNodes.length - 1) * X_SPACING) / 2;

      levelNodes.forEach((concept, index) => {
        // A node is locked if any prerequisite is not completed
        const isLocked = concept.prerequisites?.some(
          prereqId => conceptMap.get(prereqId)?.status !== 'completed'
        ) ?? false;

        layoutNodes.push({
          id: concept.id,
          concept,
          level,
          x: startX + index * X_SPACING,
          y: 50 + level * Y_SPACING,
          isLocked
        });
      });
    });

    const nodeLayoutMap = new Map<string, NodeLayout>();
    layoutNodes.forEach(n => nodeLayoutMap.set(n.id, n));

    const layoutLinks: { source: NodeLayout; target: NodeLayout }[] = [];
    layoutNodes.forEach(targetNode => {
      if (targetNode.concept.prerequisites) {
        targetNode.concept.prerequisites.forEach(prereqId => {
          const sourceNode = nodeLayoutMap.get(prereqId);
          if (sourceNode) {
            layoutLinks.push({ source: sourceNode, target: targetNode });
          }
        });
      }
    });

    // Calculate actual bounds for a tight viewBox
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    if (layoutNodes.length === 0) {
      minX = 0; maxX = 800; minY = 0; maxY = 400;
    } else {
      layoutNodes.forEach(n => {
        // Node coordinates are the center, width is 180, height is 40
        minX = Math.min(minX, n.x - NODE_WIDTH / 2);
        maxX = Math.max(maxX, n.x + NODE_WIDTH / 2);
        minY = Math.min(minY, n.y - NODE_HEIGHT / 2);
        maxY = Math.max(maxY, n.y + NODE_HEIGHT / 2);
      });
    }

    const padding = 60;
    const viewBoxX = minX - padding;
    const viewBoxY = minY - padding;
    const viewBoxWidth = (maxX - minX) + padding * 2;
    const viewBoxHeight = (maxY - minY) + padding * 2;
    const viewBoxStr = `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`;

    return { nodes: layoutNodes, links: layoutLinks, width: totalWidth, height: totalHeight, NODE_WIDTH, NODE_HEIGHT, viewBox: viewBoxStr };
  }, [course]);

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
  };

  return (
    <div style={containerStyle} className="bg-gray-50 flex items-center justify-center p-4">
      <svg
        width="100%"
        height="100%"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#9CA3AF" />
          </marker>
        </defs>

        {links.map((link, i) => {
          // Draw line from bottom center of source to top center of target
          const x1 = link.source.x;
          const y1 = link.source.y + 20; // NODE_HEIGHT / 2
          const x2 = link.target.x;
          const y2 = link.target.y - 20; // - NODE_HEIGHT / 2

          return (
            <line
              key={`link-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#9CA3AF"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
          );
        })}

        {nodes.map(node => {
          let fillColor = '#FFFFFF';
          let textColor = '#374151'; // text-gray-700
          let borderColor = '#D1D5DB'; // border-gray-300
          let strokeWidth = "2";

          if (node.isLocked) {
            fillColor = '#F3F4F6'; // bg-gray-100
            textColor = '#9CA3AF'; // text-gray-400
          } else if (activeConcept?.id === node.id) {
            fillColor = '#DBEAFE'; // bg-blue-100
            textColor = '#1E40AF'; // text-blue-800
            borderColor = '#2563eb'; // #2563eb blue
            strokeWidth = "3";
          } else if (node.concept.status === 'completed') {
            fillColor = '#16a34a'; // green fill
            textColor = '#FFFFFF'; // white text
            borderColor = '#15803d'; // dark green border
          }

          const cursor = node.isLocked ? 'not-allowed' : 'pointer';

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              onClick={() => {
                if (!node.isLocked) {
                  onSelectConcept(node.concept);
                }
              }}
              style={{ cursor, opacity: node.isLocked ? 0.5 : 1 }}
            >
              <rect
                x="-90"
                y="-20"
                width="180"
                height="40"
                rx="8"
                fill={fillColor}
                stroke={borderColor}
                strokeWidth={strokeWidth}
                className="transition-colors duration-200"
              />
              <text
                x="0"
                y="0"
                textAnchor="middle"
                dominantBaseline="central"
                fill={textColor}
                fontSize="14"
                fontWeight="500"
                pointerEvents="none"
              >
                {node.concept.title.length > 22
                  ? node.concept.title.substring(0, 20) + '...'
                  : node.concept.title}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
