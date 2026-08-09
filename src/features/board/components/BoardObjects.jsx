import React, { useEffect, useRef, useState } from 'react';
import * as ThreeModule from 'three';
import {
    BOARD_DIE_MAX_ROLL_MS, getBoardDieAngularVelocity, getBoardDieCollisionMass,
    getBoardDieCollisionResponse, getBoardDiePhysicsMetrics,
    getBoardDieReferenceDiameter, getBoardDieWorldBounds, isBoardDieMotionSettled,
    shouldFinishBoardDieRoll,
} from '../../../utils/boardDicePhysics';

export const BOARD_DIE_SIDES = [4, 6, 8, 10, 12, 20];

export const BOARD_DICE_ROLL_SIDES = [4, 6, 8, 10, 12, 20];

export const MAX_BOARD_DICE_ROLL = 80;

export const MAX_BOARD_DICE_EXPLOSIONS = 20;

const D10_FACE_VALUES = [9, 1, 7, 3, 5, 8, 0, 2, 6, 4];

const D4_VERTEX_VALUES = [
    { value: 1, vertex: { x: -1, y: -1, z: 1 } },
    { value: 2, vertex: { x: 1, y: 1, z: 1 } },
    { value: 3, vertex: { x: -1, y: 1, z: -1 } },
    { value: 4, vertex: { x: 1, y: -1, z: -1 } },
];

export const ACTIVE_BOARD_DIE_ROLL_IDS = new Set();

const BOARD_DIE_RUNTIME_REGISTRY = new Map();

const getReadableMarkerTextColor = (color = '#c8aa6e') => {
    const hex = color.replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return '#f8e7b9';

    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const luminance = (0.2126 * r) + (0.7152 * g) + (0.0722 * b);

    return luminance > 0.52 ? '#111827' : '#f8e7b9';
};

const BoardMarker3dCoin = ({ fillColor }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        let disposed = false;
        let renderer = null;
        let geometry = null;
        let rimGeometry = null;
        let rimMaterial = null;
        let materials = [];

        import('three').then((THREE) => {
            
            if (disposed || !canvasRef.current) return;

            const canvas = canvasRef.current;
            const width = Math.max(24, Math.round(canvas.clientWidth || 80));
            const height = Math.max(24, Math.round(canvas.clientHeight || 80));

            renderer = new ThreeModule.WebGLRenderer({
                canvas,
                alpha: true,
                antialias: true,
            });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            renderer.setSize(width, height, false);
            renderer.setClearColor(0x000000, 0);

            const scene = new ThreeModule.Scene();
            const camera = new ThreeModule.OrthographicCamera(-1.22, 1.22, 1.22, -1.22, 0.1, 10);
            camera.position.set(0, 4, 0);
            camera.up.set(0, 0, -1);
            camera.lookAt(0, 0, 0);

            const baseColor = new ThreeModule.Color(fillColor);
            const sideColor = baseColor.clone().multiplyScalar(0.72);
            const bottomColor = baseColor.clone().multiplyScalar(0.56);

            geometry = new ThreeModule.CylinderGeometry(1, 1, 0.22, 128, 1, false);
            materials = [
                new ThreeModule.MeshStandardMaterial({ color: sideColor, roughness: 0.5, metalness: 0.08 }),
                new ThreeModule.MeshStandardMaterial({ color: baseColor, roughness: 0.42, metalness: 0.08 }),
                new ThreeModule.MeshStandardMaterial({ color: bottomColor, roughness: 0.55, metalness: 0.04 }),
            ];

            const coin = new ThreeModule.Mesh(geometry, materials);
            scene.add(coin);

            rimGeometry = new ThreeModule.TorusGeometry(0.96, 0.035, 12, 128);
            rimMaterial = new ThreeModule.MeshStandardMaterial({
                color: baseColor.clone().multiplyScalar(0.92),
                roughness: 0.45,
                metalness: 0.1,
            });
            const rim = new ThreeModule.Mesh(rimGeometry, rimMaterial);
            rim.rotation.x = Math.PI / 2;
            rim.position.y = 0.122;
            scene.add(rim);

            const ambient = new ThreeModule.AmbientLight(0xffffff, 1.65);
            scene.add(ambient);
            const key = new ThreeModule.DirectionalLight(0xffffff, 2.2);
            key.position.set(-1.5, 4, -1.2);
            scene.add(key);
            const fill = new ThreeModule.DirectionalLight(0xd7b56c, 0.75);
            fill.position.set(1.5, 4, 1.6);
            scene.add(fill);

            renderer.render(scene, camera);
        }).catch(() => {
            // Si WebGL o three fallan, el marcador conserva sus controles y datos.
        });

        return () => {
            disposed = true;
            geometry?.dispose();
            rimGeometry?.dispose();
            rimMaterial?.dispose();
            materials.forEach(material => material.dispose());
            renderer?.dispose();
        };
    }, [fillColor]);

    return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
};

const createD10Geometry = () => {
    const vertices = [];
    const radius = 1;
    const topY = radius;
    const bottomY = -radius;
    const pentagonCos = Math.cos(Math.PI / 5);
    const waistY = radius * ((1 - pentagonCos) / (1 + pentagonCos));
    const equatorRadius = radius * 1.05;

    vertices.push(0, topY, 0);
    vertices.push(0, bottomY, 0);

    for (let i = 0; i < 10; i += 1) {
        const angle = (i * Math.PI * 2) / 10;
        const isEven = i % 2 === 0;
        vertices.push(
            Math.cos(angle) * equatorRadius,
            isEven ? waistY : -waistY,
            Math.sin(angle) * equatorRadius
        );
    }

    const indices = [];
    for (let i = 0; i < 5; i += 1) {
        const even = 2 + (i * 2);
        const prevOdd = 2 + ((i * 2 + 9) % 10);
        const nextOdd = 2 + ((i * 2 + 1) % 10);

        indices.push(0, even, prevOdd);
        indices.push(0, nextOdd, even);

        const odd = 2 + ((i * 2 + 1) % 10);
        const prevEven = 2 + ((i * 2) % 10);
        const nextEven = 2 + ((i * 2 + 2) % 10);

        indices.push(1, prevEven, odd);
        indices.push(1, odd, nextEven);
    }

    const geometry = new ThreeModule.BufferGeometry();
    geometry.setAttribute('position', new ThreeModule.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.userData.dieFaceValues = D10_FACE_VALUES;
    return geometry;
};

const createDieGeometry = (_THREE, sides) => {
    switch (Number(sides)) {
        case 4:
            return new ThreeModule.TetrahedronGeometry(1, 0);
        case 6:
            return new ThreeModule.BoxGeometry(1.55, 1.55, 1.55, 1, 1, 1);
        case 8:
            return new ThreeModule.OctahedronGeometry(1.18, 0);
        case 10:
            return createD10Geometry();
        case 12:
            return new ThreeModule.DodecahedronGeometry(1.12, 0);
        case 20:
        default:
            return new ThreeModule.IcosahedronGeometry(1.18, 0);
    }
};

const makeVec3 = (x = 0, y = 0, z = 0) => ({ x, y, z });

const cloneVec3 = (v) => makeVec3(v.x, v.y, v.z);

const addVec3 = (a, b) => makeVec3(a.x + b.x, a.y + b.y, a.z + b.z);

const subVec3 = (a, b) => makeVec3(a.x - b.x, a.y - b.y, a.z - b.z);

const scaleVec3 = (v, scalar) => makeVec3(v.x * scalar, v.y * scalar, v.z * scalar);

const dotVec3 = (a, b) => (a.x * b.x) + (a.y * b.y) + (a.z * b.z);

const crossVec3 = (a, b) => makeVec3(
    (a.y * b.z) - (a.z * b.y),
    (a.z * b.x) - (a.x * b.z),
    (a.x * b.y) - (a.y * b.x)
);

const lengthVec3 = (v) => Math.hypot(v.x, v.y, v.z);

const normalizeVec3 = (v) => {
    const length = lengthVec3(v);
    return length > 0.000001 ? scaleVec3(v, 1 / length) : makeVec3();
};

const negateVec3 = (v) => makeVec3(-v.x, -v.y, -v.z);

const distanceVec3 = (a, b) => lengthVec3(subVec3(a, b));

const averageVec3 = (vectors) => (
    vectors.length
        ? scaleVec3(vectors.reduce((acc, vector) => addVec3(acc, vector), makeVec3()), 1 / vectors.length)
        : makeVec3()
);

const getD4VertexValue = (vertex) => (
    D4_VERTEX_VALUES.reduce((best, candidate) => {
        const distance = distanceVec3(normalizeVec3(vertex), normalizeVec3(candidate.vertex));
        return distance < best.distance ? { value: candidate.value, distance } : best;
    }, { value: 1, distance: Infinity }).value
);

const applyQuaternionToVec3 = (v, q) => {
    const x = v.x;
    const y = v.y;
    const z = v.z;
    const qx = q.x;
    const qy = q.y;
    const qz = q.z;
    const qw = q.w;
    const ix = (qw * x) + (qy * z) - (qz * y);
    const iy = (qw * y) + (qz * x) - (qx * z);
    const iz = (qw * z) + (qx * y) - (qy * x);
    const iw = (-qx * x) - (qy * y) - (qz * z);
    return makeVec3(
        (ix * qw) + (iw * -qx) + (iy * -qz) - (iz * -qy),
        (iy * qw) + (iw * -qy) + (iz * -qx) - (ix * -qz),
        (iz * qw) + (iw * -qz) + (ix * -qy) - (iy * -qx)
    );
};

const createDieConvexDefinition = (sides, scale = 1) => {
    const dieSides = Number(sides) || 20;
    const geometry = createDieGeometry(null, dieSides);
    const pos = geometry.attributes.position;
    const index = geometry.index;
    const vertices = [];
    const unscaledVertices = [];
    const vertexMap = new globalThis.Map();
    const triangles = [];

    const getVertexIndex = (rawIndex) => {
        const rawX = pos.getX(rawIndex);
        const rawY = pos.getY(rawIndex);
        const rawZ = pos.getZ(rawIndex);
        const key = `${rawX.toFixed(5)}:${rawY.toFixed(5)}:${rawZ.toFixed(5)}`;
        if (!vertexMap.has(key)) {
            vertexMap.set(key, vertices.length);
            vertices.push({ x: rawX * scale, y: rawY * scale, z: rawZ * scale });
            unscaledVertices.push(makeVec3(rawX, rawY, rawZ));
        }
        return vertexMap.get(key);
    };

    const totalIndices = index ? index.count : pos.count;
    for (let i = 0; i < totalIndices; i += 3) {
        const a = getVertexIndex(index ? index.getX(i) : i);
        const b = getVertexIndex(index ? index.getX(i + 1) : i + 1);
        const c = getVertexIndex(index ? index.getX(i + 2) : i + 2);
        if (a !== b && b !== c && a !== c) {
            const va = unscaledVertices[a];
            const vb = unscaledVertices[b];
            const vc = unscaledVertices[c];
            const center = averageVec3([va, vb, vc]);
            let normal = normalizeVec3(crossVec3(subVec3(vb, va), subVec3(vc, va)));
            const outwardFace = dotVec3(normal, center) < 0 ? [a, c, b] : [a, b, c];
            if (dotVec3(normal, center) < 0) normal = negateVec3(normal);
            triangles.push({ face: outwardFace, normal, center });
        }
    }

    const faceGroups = [];
    triangles.forEach((triangle) => {
        const group = faceGroups.find(candidate => dotVec3(candidate.normal, triangle.normal) > 0.985);
        if (group) {
            group.indices.push(...triangle.face);
            group.normal = normalizeVec3(addVec3(group.normal, triangle.normal));
            group.centers.push(triangle.center);
        } else {
            faceGroups.push({ normal: cloneVec3(triangle.normal), indices: [...triangle.face], centers: [triangle.center] });
        }
    });

    const faces = faceGroups.map((group) => {
        const uniqueIndices = [...new Set(group.indices)];
        const center = averageVec3(uniqueIndices.map(vertexIndex => unscaledVertices[vertexIndex]));

        if (uniqueIndices.length <= 3) {
            const orderedTriangle = [...uniqueIndices];
            const normal = normalizeVec3(crossVec3(
                subVec3(unscaledVertices[orderedTriangle[1]], unscaledVertices[orderedTriangle[0]]),
                subVec3(unscaledVertices[orderedTriangle[2]], unscaledVertices[orderedTriangle[0]])
            ));
            if (dotVec3(normal, group.normal) < 0) orderedTriangle.reverse();
            return orderedTriangle;
        }

        const first = unscaledVertices[uniqueIndices[0]];
        const axisU = normalizeVec3(subVec3(first, center));
        const axisV = normalizeVec3(crossVec3(group.normal, axisU));

        const ordered = uniqueIndices.sort((a, b) => {
            const va = subVec3(unscaledVertices[a], center);
            const vb = subVec3(unscaledVertices[b], center);
            return Math.atan2(dotVec3(va, axisV), dotVec3(va, axisU)) - Math.atan2(dotVec3(vb, axisV), dotVec3(vb, axisU));
        });

        if (ordered.length >= 3) {
            const checkNormal = normalizeVec3(crossVec3(
                subVec3(unscaledVertices[ordered[1]], unscaledVertices[ordered[0]]),
                subVec3(unscaledVertices[ordered[2]], unscaledVertices[ordered[0]])
            ));
            if (dotVec3(checkNormal, group.normal) < 0) {
                ordered.reverse();
            }
        }
        return ordered;
    });

    let orderedFaceGroups = faceGroups;
    if (dieSides === 10) {
        orderedFaceGroups = [...faceGroups].sort((a, b) => {
            const centerA = averageVec3(a.centers);
            const centerB = averageVec3(b.centers);
            return Math.atan2(centerA.z, centerA.x) - Math.atan2(centerB.z, centerB.x);
        }).slice(0, 10);
    } else {
        orderedFaceGroups = orderedFaceGroups.slice(0, dieSides);
    }

    const faceData = orderedFaceGroups.map((group, indexNumber) => ({
        value: dieSides === 10 ? D10_FACE_VALUES[indexNumber] : indexNumber + 1,
        normal: normalizeVec3(group.normal),
        center: averageVec3(group.centers),
        vertices: [...new Set(group.indices)].map(vertexIndex => cloneVec3(unscaledVertices[vertexIndex])),
    }));

    geometry.dispose();
    return { vertices, faces, faceData };
};

const createCannonDieShape = (CANNON, sides, scale = 0.78) => {
    const dieSides = Number(sides) || 20;
    if (dieSides === 6) {
        return new CANNON.Box(new CANNON.Vec3(scale, scale, scale));
    }

    // Dados poliédricos reales: d4 tetraedro, d8 octaedro, d10 trapezoedro,
    // d12 dodecaedro y d20 icosaedro. No se usa collider esférico, cilíndrico
    // ni caja genérica para estos dados.
    const definition = createDieConvexDefinition(dieSides, scale);
    return new CANNON.ConvexPolyhedron({
        vertices: definition.vertices.map(vertex => new CANNON.Vec3(vertex.x, vertex.y, vertex.z)),
        faces: definition.faces,
    });
};

const createFallbackCannonDieShape = (CANNON, sides) => {
    const scale = 0.78;
    const v = (x, y, z) => new CANNON.Vec3(x * scale, y * scale, z * scale);
    const dieSides = Number(sides) || 20;

    if (dieSides === 4) {
        return new CANNON.ConvexPolyhedron({
            vertices: [v(1, 1, 1), v(-1, -1, 1), v(-1, 1, -1), v(1, -1, -1)],
            faces: [[0, 2, 1], [0, 1, 3], [0, 3, 2], [1, 2, 3]]
        });
    }

    if (dieSides === 8) {
        return new CANNON.ConvexPolyhedron({
            vertices: [v(1, 0, 0), v(-1, 0, 0), v(0, 1, 0), v(0, -1, 0), v(0, 0, 1), v(0, 0, -1)],
            faces: [[0, 2, 4], [4, 2, 1], [1, 2, 5], [5, 2, 0], [0, 4, 3], [4, 1, 3], [1, 5, 3], [5, 0, 3]]
        });
    }

    if (dieSides === 10) {
        const radius = 1;
        const pentagonCos = Math.cos(Math.PI / 5);
        const waistY = radius * ((1 - pentagonCos) / (1 + pentagonCos));
        const equatorRadius = radius * 1.05;
        const vertices = [v(0, radius, 0), v(0, -radius, 0)];
        for (let i = 0; i < 10; i += 1) {
            const angle = (i * Math.PI * 2) / 10;
            vertices.push(v(
                Math.cos(angle) * equatorRadius,
                i % 2 === 0 ? waistY : -waistY,
                Math.sin(angle) * equatorRadius
            ));
        }
        const faces = [];
        for (let i = 0; i < 5; i += 1) {
            faces.push([0, 2 + (i * 2), 2 + ((i * 2 + 9) % 10), 2 + ((i * 2 + 1) % 10)]);
            faces.push([1, 2 + ((i * 2) % 10), 2 + ((i * 2 + 1) % 10), 2 + ((i * 2 + 2) % 10)]);
        }
        return new CANNON.ConvexPolyhedron({ vertices, faces });
    }

    throw new Error(`No rounded fallback is allowed for d${dieSides}`);
};

const getDieFaceData = (geometry, sides) => {
    const dieSides = Number(sides) || 20;
    if (dieSides !== 6) {
        return createDieConvexDefinition(dieSides, 1).faceData;
    }

    const pos = geometry.attributes.position;
    const index = geometry.index;
    const getVertex = (i) => {
        const rawIndex = index ? index.getX(i) : i;
        return makeVec3(pos.getX(rawIndex), pos.getY(rawIndex), pos.getZ(rawIndex));
    };

    const totalIndices = index ? index.count : pos.count;
    const triangles = [];
    for (let i = 0; i < totalIndices; i += 3) {
        const vA = getVertex(i);
        const vB = getVertex(i + 1);
        const vC = getVertex(i + 2);
        const centroid = averageVec3([vA, vB, vC]);
        let normal = normalizeVec3(crossVec3(subVec3(vB, vA), subVec3(vC, vA)));
        if (dotVec3(normal, centroid) < 0) normal = negateVec3(normal);
        triangles.push({ vertices: [vA, vB, vC], centroid, normal });
    }

    const groups = [];
    const normalTolerance = 0.98;
    triangles.forEach((triangle) => {
        let group = groups.find(candidate => dotVec3(candidate.normal, triangle.normal) > normalTolerance);
        if (!group) {
            group = { normal: cloneVec3(triangle.normal), centroids: [], vertices: [] };
            groups.push(group);
        }
        group.centroids.push(triangle.centroid);
        group.vertices.push(...triangle.vertices);
        group.normal = normalizeVec3(addVec3(group.normal, triangle.normal));
    });

    return groups
        .sort((a, b) => b.normal.y - a.normal.y)
        .slice(0, Number(sides) || 20)
        .map((group, indexNumber) => ({
            value: indexNumber + 1,
            normal: normalizeVec3(group.normal),
            center: averageVec3(group.centroids),
            vertices: group.vertices,
        }));
};

const createNumberedFaces = (geometry, sides, textColor, renderer) => {
    
    const facesGroup = new ThreeModule.Group();
    const labels = [];
    const dieSides = Number(sides) || 20;
    getDieFaceData(geometry, sides).forEach((face) => {
        const center = face.center;
        const normal = face.normal;
        const maxRadius = face.vertices.reduce((max, vertex) => (
            Math.max(max, distanceVec3(vertex, center))
        ), 0.55);

        if (dieSides === 4) {
            face.vertices.forEach((vertex) => {
                const value = getD4VertexValue(vertex);
                const labelCenter = addVec3(scaleVec3(center, 0.42), scaleVec3(vertex, 0.58));
                const canvas = document.createElement('canvas');
                canvas.width = 160;
                canvas.height = 160;
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = textColor;
                ctx.font = '900 92px Georgia, serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.lineWidth = 7;
                ctx.strokeStyle = textColor === '#111827'
                    ? 'rgba(255,255,255,0.26)'
                    : 'rgba(0,0,0,0.72)';
                ctx.strokeText(String(value), 80, 84);
                ctx.fillText(String(value), 80, 84);

                const texture = new ThreeModule.CanvasTexture(canvas);
                texture.anisotropy = Math.min(renderer?.capabilities?.getMaxAnisotropy?.() || 1, 8);
                const material = new ThreeModule.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    depthTest: true,
                    depthWrite: false,
                    side: ThreeModule.DoubleSide,
                });
                const plane = new ThreeModule.Mesh(new ThreeModule.PlaneGeometry(0.32, 0.32), material);
                plane.position.set(
                    labelCenter.x + (normal.x * 0.032),
                    labelCenter.y + (normal.y * 0.032),
                    labelCenter.z + (normal.z * 0.032)
                );
                plane.lookAt(
                    plane.position.x + normal.x,
                    plane.position.y + normal.y,
                    plane.position.z + normal.z
                );
                facesGroup.add(plane);
                labels.push({ mesh: plane, normal: cloneVec3(normal), geometry: plane.geometry, material, texture });
            });
            return;
        }

        const planeSize = Math.max(0.34, Math.min(0.72, maxRadius * 0.9));

        const canvas = document.createElement('canvas');
        canvas.width = 192;
        canvas.height = 192;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = textColor;
        ctx.font = '900 108px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 8;
        ctx.strokeStyle = textColor === '#111827'
            ? 'rgba(255,255,255,0.26)'
            : 'rgba(0,0,0,0.72)';
        ctx.strokeText(String(face.value), 96, 102);
        ctx.fillText(String(face.value), 96, 102);

        const texture = new ThreeModule.CanvasTexture(canvas);
        texture.anisotropy = Math.min(renderer?.capabilities?.getMaxAnisotropy?.() || 1, 8);
        const material = new ThreeModule.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthTest: true,
            depthWrite: false,
            side: ThreeModule.DoubleSide,
        });
        const plane = new ThreeModule.Mesh(new ThreeModule.PlaneGeometry(planeSize, planeSize), material);
        plane.position.set(
            center.x + (normal.x * 0.025),
            center.y + (normal.y * 0.025),
            center.z + (normal.z * 0.025)
        );
        plane.lookAt(
            plane.position.x + normal.x,
            plane.position.y + normal.y,
            plane.position.z + normal.z
        );
        facesGroup.add(plane);
        labels.push({ mesh: plane, normal: cloneVec3(normal), geometry: plane.geometry, material, texture });
    });

    facesGroup.userData.labels = labels;
    return facesGroup;
};

const BoardDie3d = ({ sides = 20, color = '#c8aa6e', rotationRef, renderRequestRef }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        let disposed = false;
        let renderer = null;
        let geometry = null;
        let material = null;
        let edgeGeometry = null;
        let edgeMaterial = null;
        let numberedFaces = null;
        let resizeObserver = null;

        const setupRenderer = () => {
            if (disposed || !canvasRef.current) return;

            const canvas = canvasRef.current;

            renderer = new ThreeModule.WebGLRenderer({
                canvas,
                alpha: true,
                antialias: true,
                premultipliedAlpha: false,
            });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            renderer.setClearColor(0x000000, 0);
            renderer.setClearAlpha(0);

            const scene = new ThreeModule.Scene();
            const camera = new ThreeModule.OrthographicCamera(-1.65, 1.65, 1.65, -1.65, 0.1, 10);
            camera.position.set(0, 4.6, 0);
            camera.up.set(0, 0, -1);
            camera.lookAt(0, 0, 0);

            const baseColor = new ThreeModule.Color(color);
            geometry = createDieGeometry(null, sides);
            material = new ThreeModule.MeshStandardMaterial({
                color: baseColor,
                roughness: 0.5,
                metalness: 0.06,
                flatShading: true,
                side: ThreeModule.DoubleSide,
            });

            const die = new ThreeModule.Mesh(geometry, material);
            die.rotation.set(
                rotationRef?.current?.x || 0,
                rotationRef?.current?.y ?? 0.25,
                rotationRef?.current?.z || 0
            );
            scene.add(die);
            
            edgeGeometry = new ThreeModule.EdgesGeometry(geometry, 18);
            edgeMaterial = new ThreeModule.LineBasicMaterial({
                color: baseColor.clone().multiplyScalar(0.48),
                transparent: true,
                opacity: 0.72,
            });
            const edges = new ThreeModule.LineSegments(edgeGeometry, edgeMaterial);
            edges.rotation.copy(die.rotation);
            scene.add(edges);

            numberedFaces = createNumberedFaces(
                geometry,
                sides,
                getReadableMarkerTextColor(color),
                renderer
            );
            die.add(numberedFaces);

            const renderFrame = () => {
                if (disposed) return;
                if (rotationRef && rotationRef.current) {
                    die.rotation.set(rotationRef.current.x, rotationRef.current.y, rotationRef.current.z);
                    edges.rotation.copy(die.rotation);
                }
                renderer.render(scene, camera);
            };

            const ambient = new ThreeModule.AmbientLight(0xffffff, 1.35);
            scene.add(ambient);
            const key = new ThreeModule.DirectionalLight(0xffffff, 2.35);
            key.position.set(-1.6, 5.2, -1.4);
            scene.add(key);
            const fill = new ThreeModule.DirectionalLight(0xd7b56c, 0.72);
            fill.position.set(1.6, 3.2, 1.4);
            scene.add(fill);

            const resizeAndRender = () => {
                if (disposed || !canvasRef.current || !renderer) return;
                const width = Math.max(32, Math.round(canvasRef.current.clientWidth || 96));
                const height = Math.max(32, Math.round(canvasRef.current.clientHeight || 96));
                renderer.setSize(width, height, false);
                renderFrame();
            };

            if (renderRequestRef) renderRequestRef.current = renderFrame;
            if (typeof ResizeObserver !== 'undefined') {
                resizeObserver = new ResizeObserver(resizeAndRender);
                resizeObserver.observe(canvas);
            }
            resizeAndRender();
        };

        try {
            setupRenderer();
        } catch (error) {
            console.error('Error rendering board die', error);
        }

        return () => {
            disposed = true;
            resizeObserver?.disconnect();
            if (renderRequestRef) renderRequestRef.current = null;
            geometry?.dispose();
            material?.dispose();
            edgeGeometry?.dispose();
            edgeMaterial?.dispose();
            numberedFaces?.userData?.labels?.forEach(label => {
                label.geometry?.dispose();
                label.texture?.dispose();
                label.material?.dispose();
            });
            renderer?.dispose();
        };
    }, [sides, color, renderRequestRef, rotationRef]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-[-14%] block h-[128%] w-[128%] bg-transparent"
            style={{
                background: 'transparent',
                clipPath: 'circle(49% at 50% 50%)',
            }}
            aria-hidden="true"
        />
    );
};

const getDieTopFaceResult = (sides, quaternionLike) => {
    const dieSides = Number(sides) || 20;
    const worldUp = makeVec3(0, 1, 0);

    if (dieSides === 4) {
        const definition = createDieConvexDefinition(4, 1);
        return definition.vertices.reduce((best, vertex) => {
            const upAlignment = dotVec3(applyQuaternionToVec3(vertex, quaternionLike), worldUp);
            return upAlignment > best.upAlignment
                ? { value: getD4VertexValue(vertex), upAlignment }
                : best;
        }, { value: 1, upAlignment: -Infinity });
    }

    const geometry = createDieGeometry(null, sides);
    const faces = getDieFaceData(geometry, sides);
    geometry.dispose();

    return faces.reduce((best, face) => {
        const upAlignment = dotVec3(applyQuaternionToVec3(face.normal, quaternionLike), worldUp);
        return upAlignment > best.upAlignment
            ? { value: face.value, upAlignment }
            : best;
    }, { value: 1, upAlignment: -Infinity });
};

const getDieTopFaceValue = (sides, quaternionLike) => getDieTopFaceResult(sides, quaternionLike).value;

const getCannonShapeRestingHeight = (CANNON, shape, quaternion) => {
    const convexShape = shape?.vertices?.length ? shape : shape?.convexPolyhedronRepresentation;
    if (!convexShape?.vertices?.length) {
        return Math.max(0.55, (Number(shape?.boundingSphereRadius) || 1) * 0.64);
    }

    const transformed = new CANNON.Vec3();
    const lowestY = convexShape.vertices.reduce((lowest, vertex) => {
        quaternion.vmult(vertex, transformed);
        return Math.min(lowest, transformed.y);
    }, Infinity);
    return Number.isFinite(lowestY) ? Math.max(0.05, -lowestY) : 0.62;
};

export const BoardDieVisual = ({ die, className = '', isDragging = false, currentDieRollSpeed = 0, dragDirection = 0, enableRollPhysics = true }) => {
    const rotationRef = useRef({ x: 0, y: 0.25, z: 0 });
    const renderRequestRef = useRef(null);
    const animationFrameRef = useRef(null);
    const [localValue, setLocalValue] = useState(null);
    const [isRolling, setIsRolling] = useState(false);

    useEffect(() => {
        setLocalValue(null);
    }, [die?.dieValue, die?.dieSides]);

    useEffect(() => {
        if (!die?.dieRotation3d) return;
        const nextRotation = {
            x: Number(die.dieRotation3d.x) || 0,
            y: Number(die.dieRotation3d.y) || 0,
            z: Number(die.dieRotation3d.z) || 0,
        };
        rotationRef.current = nextRotation;
        renderRequestRef.current?.();
    }, [die?.dieRotation3d?.x, die?.dieRotation3d?.y, die?.dieRotation3d?.z]);

    useEffect(() => {
        if (!enableRollPhysics || !die?.id) return undefined;
        const runtime = {
            rotationRef,
            renderRequestRef,
            setRolling: setIsRolling,
            setValue: setLocalValue,
        };
        BOARD_DIE_RUNTIME_REGISTRY.set(die.id, runtime);
        return () => {
            if (BOARD_DIE_RUNTIME_REGISTRY.get(die.id) === runtime) {
                BOARD_DIE_RUNTIME_REGISTRY.delete(die.id);
            }
        };
    }, [die?.id, enableRollPhysics]);

    useEffect(() => {
        if (!enableRollPhysics) return undefined;
        let disposed = false;
        let rolling = false;
        const controlledDieIds = new Set();

        const setDieRolling = (id, nextRolling) => {
            const runtime = BOARD_DIE_RUNTIME_REGISTRY.get(id);
            const wrapper = document.getElementById(`token-inner-wrapper-${id}`);
            if (nextRolling) {
                controlledDieIds.add(id);
                ACTIVE_BOARD_DIE_ROLL_IDS.add(id);
                runtime?.setRolling(true);
                if (wrapper) wrapper.style.willChange = 'transform';
                return;
            }

            controlledDieIds.delete(id);
            ACTIVE_BOARD_DIE_ROLL_IDS.delete(id);
            runtime?.setRolling(false);
            if (wrapper) {
                wrapper.style.transform = 'translate(0px, 0px) translateY(0px) scale(1)';
                wrapper.style.willChange = '';
            }
        };

        const stopRolling = () => {
            rolling = false;
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            [...controlledDieIds].forEach(id => setDieRolling(id, false));
        };

        const handleRoll = async (e) => {
            if (e.detail.id !== die.id || rolling || ACTIVE_BOARD_DIE_ROLL_IDS.has(die.id)) return;
            rolling = true;
            setDieRolling(die.id, true);
            const {
                velocity = {},
                settleInPlace = false,
                bounds = null,
                obstacles = [],
                zoom = 1,
                width = die.width,
                height = die.height,
            } = e.detail;
            const dieSides = Number(die.dieSides) || 20;

            obstacles.forEach((obstacle) => {
                if (!obstacle?.id) return;
                controlledDieIds.add(obstacle.id);
                ACTIVE_BOARD_DIE_ROLL_IDS.add(obstacle.id);
            });

            setLocalValue('');

            try {
                const CANNON = await import('cannon-es');
                if (disposed) return;
                const innerWrapper = document.getElementById(`token-inner-wrapper-${die.id}`);
                if (!innerWrapper) {
                    stopRolling();
                    return;
                }

                const physicsMetrics = getBoardDiePhysicsMetrics({
                    sides: dieSides,
                    width,
                    height,
                    zoom,
                });
                const pxPerMeter = physicsMetrics.localPixelsPerMeter;
                const worldBounds = getBoardDieWorldBounds(bounds, physicsMetrics.screenPixelsPerMeter);
                const world = new CANNON.World({
                    gravity: new CANNON.Vec3(0, -26, 0),
                });
                world.allowSleep = true;
                world.solver.iterations = 12;
                world.solver.tolerance = 0.001;
                world.defaultContactMaterial.friction = 0.28;
                world.defaultContactMaterial.restitution = 0.24;

                const dieMaterial = new CANNON.Material('die');
                const tableMaterial = new CANNON.Material('table');
                world.addContactMaterial(new CANNON.ContactMaterial(dieMaterial, tableMaterial, {
                    friction: 0.36,
                    restitution: 0.2,
                    contactEquationStiffness: 1e8,
                    contactEquationRelaxation: 3,
                }));
                world.addContactMaterial(new CANNON.ContactMaterial(dieMaterial, dieMaterial, {
                    friction: 0.24,
                    restitution: 0.38,
                    contactEquationStiffness: 1e8,
                    contactEquationRelaxation: 3,
                }));

                let dieShape;
                try {
                    dieShape = createCannonDieShape(CANNON, dieSides);
                } catch (shapeError) {
                    console.warn("Fallback physics shape for board die", dieSides, shapeError);
                    dieShape = createFallbackCannonDieShape(CANNON, dieSides);
                }

                const body = new CANNON.Body({
                    mass: 1.35,
                    material: dieMaterial,
                    linearDamping: 0.13,
                    angularDamping: 0.2,
                    position: new CANNON.Vec3(0, 1.7, 0),
                    shape: dieShape,
                });
                body.allowSleep = true;
                body.sleepSpeedLimit = 0.16;
                body.sleepTimeLimit = 0.5;
                const baseRotation = new CANNON.Quaternion();
                baseRotation.setFromEuler(rotationRef.current.x, rotationRef.current.y, rotationRef.current.z, 'XYZ');
                body.quaternion.copy(baseRotation);
                body.position.y = getCannonShapeRestingHeight(CANNON, dieShape, body.quaternion) + 0.12;

                const launchX = Number(velocity.x) || 0;
                const launchZ = Number(velocity.y) || 0;
                const launchPower = Math.max(0.26, Math.min(1.3, Math.hypot(launchX, launchZ)));
                const d4Boost = dieSides === 4 ? 1.22 : 1;
                body.velocity.set(launchX * 8.6, 3.4 + (launchPower * 1.8 * d4Boost), launchZ * 8.6);
                const angularVelocity = getBoardDieAngularVelocity({ launchX, launchZ, sides: dieSides });
                body.angularVelocity.set(angularVelocity.x, angularVelocity.y, angularVelocity.z);
                world.addBody(body);
                const simulatedDice = [{
                    id: die.id,
                    sides: dieSides,
                    body,
                    shape: dieShape,
                    wrapper: innerWrapper,
                    runtime: BOARD_DIE_RUNTIME_REGISTRY.get(die.id),
                    startX: 0,
                    startZ: 0,
                    lastDx: 0,
                    lastDy: 0,
                    affected: true,
                    primary: true,
                    cockedRetries: 0,
                }];

                const floor = new CANNON.Body({ mass: 0, material: tableMaterial });
                floor.addShape(new CANNON.Plane());
                floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
                world.addBody(floor);

                if (!settleInPlace && worldBounds) {
                    const left = -worldBounds.left;
                    const right = worldBounds.right;
                    const top = -worldBounds.top;
                    const bottom = worldBounds.bottom;
                    const wallSpecs = [
                        { x: left, z: 0, rotY: Math.PI / 2 },
                        { x: right, z: 0, rotY: -Math.PI / 2 },
                        { x: 0, z: top, rotY: 0 },
                        { x: 0, z: bottom, rotY: Math.PI },
                    ];
                    wallSpecs.forEach((spec) => {
                        const wall = new CANNON.Body({ mass: 0, material: tableMaterial });
                        wall.addShape(new CANNON.Plane());
                        wall.position.set(spec.x, 0, spec.z);
                        wall.quaternion.setFromEuler(0, spec.rotY, 0);
                        world.addBody(wall);
                    });
                }

                if (!settleInPlace) {
                    obstacles.forEach((obstacle) => {
                        try {
                            const obstacleRuntime = BOARD_DIE_RUNTIME_REGISTRY.get(obstacle.id);
                            const obstacleWrapper = document.getElementById(`token-inner-wrapper-${obstacle.id}`);
                            if (!obstacleRuntime || !obstacleWrapper) return;
                            const obstacleDiameterMeters = Math.max(
                                0.5,
                                Math.min(Number(obstacle.width) || 48, Number(obstacle.height) || Number(obstacle.width) || 48) / pxPerMeter
                            );
                            const obstacleScale = 0.78 * (obstacleDiameterMeters / getBoardDieReferenceDiameter(obstacle.sides));
                            const obstacleShape = createCannonDieShape(CANNON, obstacle.sides, obstacleScale);
                            const obstacleBody = new CANNON.Body({
                                mass: getBoardDieCollisionMass({
                                    diameter: obstacleDiameterMeters,
                                    referenceDiameter: physicsMetrics.referenceDiameter,
                                }),
                                material: dieMaterial,
                                shape: obstacleShape,
                                linearDamping: 0.13,
                                angularDamping: 0.2,
                            });
                            obstacleBody.allowSleep = true;
                            obstacleBody.sleepSpeedLimit = 0.16;
                            obstacleBody.sleepTimeLimit = 0.5;
                            const rotation = obstacle.rotation3d || {};
                            obstacleBody.quaternion.setFromEuler(
                                Number(rotation.x) || 0,
                                Number(rotation.y) || 0,
                                Number(rotation.z) || 0,
                                'XYZ'
                            );
                            obstacleBody.position.set(
                                (Number(obstacle.dx) || 0) / pxPerMeter,
                                getCannonShapeRestingHeight(CANNON, obstacleShape, obstacleBody.quaternion),
                                (Number(obstacle.dy) || 0) / pxPerMeter
                            );
                            world.addBody(obstacleBody);
                            obstacleBody.sleep();
                            simulatedDice.push({
                                id: obstacle.id,
                                sides: Number(obstacle.sides) || 20,
                                body: obstacleBody,
                                shape: obstacleShape,
                                wrapper: obstacleWrapper,
                                runtime: obstacleRuntime,
                                startX: obstacleBody.position.x,
                                startZ: obstacleBody.position.z,
                                lastDx: 0,
                                lastDy: 0,
                                affected: false,
                                primary: false,
                                cockedRetries: 0,
                            });
                        } catch (obstacleError) {
                            console.warn('Could not create dynamic die collider', obstacleError);
                        }
                    });
                }

                const diceByBodyId = new Map(simulatedDice.map(entry => [entry.body.id, entry]));
                const collisionPairsThisStep = new Set();
                simulatedDice.forEach((sourceEntry) => {
                    sourceEntry.body.addEventListener('collide', (event) => {
                        const targetEntry = diceByBodyId.get(event.body?.id);
                        if (!targetEntry || targetEntry.id === sourceEntry.id) return;
                        const pairKey = [sourceEntry.id, targetEntry.id].sort().join(':');
                        if (collisionPairsThisStep.has(pairKey)) return;
                        collisionPairsThisStep.add(pairKey);

                        const deltaX = targetEntry.body.position.x - sourceEntry.body.position.x;
                        const deltaZ = targetEntry.body.position.z - sourceEntry.body.position.z;
                        const horizontalDistance = Math.hypot(deltaX, deltaZ);
                        if (horizontalDistance < 0.001) return;
                        const normalX = deltaX / horizontalDistance;
                        const normalZ = deltaZ / horizontalDistance;
                        const impactSpeed = Math.max(0,
                            ((sourceEntry.body.velocity.x - targetEntry.body.velocity.x) * normalX)
                            + ((sourceEntry.body.velocity.z - targetEntry.body.velocity.z) * normalZ)
                        );
                        const response = getBoardDieCollisionResponse({
                            impactSpeed,
                            sourceMass: sourceEntry.body.mass,
                            targetMass: targetEntry.body.mass,
                        });
                        if (!response.active) return;

                        const impulse = new CANNON.Vec3(
                            normalX * response.impulse,
                            0,
                            normalZ * response.impulse
                        );
                        const oppositeImpulse = new CANNON.Vec3(-impulse.x, 0, -impulse.z);
                        const contact = event.contact;
                        const sourceContact = contact?.bi === sourceEntry.body
                            ? contact.ri
                            : contact?.bj === sourceEntry.body ? contact.rj : null;
                        const targetContact = contact?.bi === targetEntry.body
                            ? contact.ri
                            : contact?.bj === targetEntry.body ? contact.rj : null;

                        sourceEntry.body.wakeUp();
                        targetEntry.body.wakeUp();
                        sourceEntry.body.applyImpulse(
                            oppositeImpulse,
                            sourceContact
                                ? new CANNON.Vec3(sourceContact.x, sourceContact.y, sourceContact.z)
                                : new CANNON.Vec3()
                        );
                        targetEntry.body.applyImpulse(
                            impulse,
                            targetContact
                                ? new CANNON.Vec3(targetContact.x, targetContact.y, targetContact.z)
                                : new CANNON.Vec3()
                        );
                    });
                });

                const startTime = performance.now();
                let lastTime = startTime;
                let settledFrames = 0;

                const loop = (time) => {
                    if (disposed || !rolling) return;
                    const delta = Math.min((time - lastTime) / 1000, 1 / 30);
                    lastTime = time;
                    collisionPairsThisStep.clear();
                    world.step(1 / 60, delta, 4);

                    const elapsed = time - startTime;
                    const allDiceSettled = simulatedDice.every((entry) => {
                        const speed = entry.body.velocity.length();
                        const spin = entry.body.angularVelocity.length();
                        const isSleeping = entry.body.sleepState === CANNON.Body.SLEEPING;

                        if (!entry.primary && !entry.affected && !isSleeping) {
                            entry.affected = true;
                            setDieRolling(entry.id, true);
                            entry.runtime?.setValue('');
                        }
                        if (!entry.primary && !entry.affected) return true;

                        const euler = new ThreeModule.Euler().setFromQuaternion(
                            new ThreeModule.Quaternion(
                                entry.body.quaternion.x,
                                entry.body.quaternion.y,
                                entry.body.quaternion.z,
                                entry.body.quaternion.w
                            ),
                            'XYZ'
                        );
                        const nextRotation = { x: euler.x, y: euler.y, z: euler.z };
                        if (entry.runtime?.rotationRef) {
                            entry.runtime.rotationRef.current = nextRotation;
                            entry.runtime.renderRequestRef.current?.();
                        }

                        entry.lastDx = (entry.body.position.x - entry.startX) * pxPerMeter;
                        entry.lastDy = (entry.body.position.z - entry.startZ) * pxPerMeter;
                        const restingHeight = getCannonShapeRestingHeight(
                            CANNON,
                            entry.shape,
                            entry.body.quaternion
                        );
                        const lift = Math.max(0, (entry.body.position.y - restingHeight) * pxPerMeter);
                        entry.wrapper.style.transform = `translate(${entry.lastDx}px, ${entry.lastDy}px) translateY(${-lift}px) scale(${1 + Math.min(0.08, lift / 900)})`;

                        return isBoardDieMotionSettled({ elapsedMs: elapsed, speed, spin, sleeping: isSleeping });
                    });

                    if (allDiceSettled) {
                        settledFrames += 1;
                    } else {
                        settledFrames = 0;
                    }

                    if (shouldFinishBoardDieRoll({ elapsedMs: elapsed, settledFrames })) {
                        const timedOut = elapsed >= BOARD_DIE_MAX_ROLL_MS;
                        const participatingDice = simulatedDice.filter(entry => entry.primary || entry.affected);
                        const cockedDice = timedOut
                            ? []
                            : participatingDice.filter((entry) => (
                                getDieTopFaceResult(entry.sides, entry.body.quaternion).upAlignment < 0.78
                                && entry.cockedRetries < 2
                            ));

                        if (cockedDice.length > 0) {
                            settledFrames = 0;
                            cockedDice.forEach((entry) => {
                                entry.cockedRetries += 1;
                                entry.body.wakeUp();
                                entry.body.position.y += 0.16;
                                entry.body.velocity.set(0, 1.15, 0);
                                entry.body.angularVelocity.set(
                                    (Math.random() - 0.5) * 3.5,
                                    (Math.random() - 0.5) * 2.5,
                                    (Math.random() - 0.5) * 3.5
                                );
                            });
                            animationFrameRef.current = requestAnimationFrame(loop);
                            return;
                        }

                        const rolls = participatingDice.map((entry) => {
                            const settledEuler = new ThreeModule.Euler().setFromQuaternion(
                                new ThreeModule.Quaternion(
                                    entry.body.quaternion.x,
                                    entry.body.quaternion.y,
                                    entry.body.quaternion.z,
                                    entry.body.quaternion.w
                                ),
                                'XYZ'
                            );
                            const settledRotation = {
                                x: settledEuler.x,
                                y: settledEuler.y,
                                z: settledEuler.z,
                            };
                            const rolledValue = getDieTopFaceResult(entry.sides, entry.body.quaternion).value;
                            if (entry.runtime?.rotationRef) {
                                entry.runtime.rotationRef.current = settledRotation;
                                entry.runtime.renderRequestRef.current?.();
                                entry.runtime.setValue(rolledValue);
                            }
                            return {
                                id: entry.id,
                                dx: entry.primary && settleInPlace ? 0 : entry.lastDx,
                                dy: entry.primary && settleInPlace ? 0 : entry.lastDy,
                                value: rolledValue,
                                rotation3d: settledRotation,
                                instant: true,
                            };
                        });

                        window.dispatchEvent(new CustomEvent('save-die-roll', {
                            detail: { rolls }
                        }));
                        stopRolling();
                        return;
                    }

                    animationFrameRef.current = requestAnimationFrame(loop);
                };
                animationFrameRef.current = requestAnimationFrame(loop);
            } catch (err) {
                console.error("Error rolling board die", err);
                let rolledValue = Number(die.dieValue) || 1;
                try {
                    
                    const quaternion = new ThreeModule.Quaternion().setFromEuler(
                        new ThreeModule.Euler(rotationRef.current.x, rotationRef.current.y, rotationRef.current.z, 'XYZ')
                    );
                    rolledValue = getDieTopFaceValue(Number(die.dieSides) || 20, quaternion);
                } catch (resultError) {
                    console.error("Error reading board die result from orientation", resultError);
                }
                setLocalValue(rolledValue);
                stopRolling();
                window.dispatchEvent(new CustomEvent('save-die-roll', {
                    detail: { id: die.id, dx: 0, dy: 0, value: rolledValue, rotation3d: rotationRef.current }
                }));
            }
        };
        
        window.addEventListener('roll-die', handleRoll);
        return () => {
            disposed = true;
            window.removeEventListener('roll-die', handleRoll);
            stopRolling();
        };
    }, [enableRollPhysics, die.id, die.dieSides, die.width, die.height]);

    const sides = Number(die?.dieSides) || 20;
    const color = die?.dieColor || '#c8aa6e';
    const displayValue = localValue === '' ? null : (localValue ?? die?.dieValue);
    const showD4FloatingResult = sides === 4 && displayValue !== null && displayValue !== undefined && !isDragging;

    return (
        <div
            className={`relative h-full w-full overflow-visible bg-transparent ${className}`}
            style={{ perspective: 420 }}
            data-die-rolling={isRolling ? 'true' : 'false'}
        >
            {/* --- INDICADOR DE TIRACHINAS (NUEVO) --- */}
            {isDragging && currentDieRollSpeed > 0.02 && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[60]" style={{ transform: 'translateZ(100px)' }}>
                    {/* Halo de Tensión (Círculo que se contrae/expande) */}
                    <div 
                        className="absolute rounded-full border-[3px] transition-all duration-75"
                        style={{
                            width: '120%',
                            height: '120%',
                            borderColor: currentDieRollSpeed > 0.8 ? '#ff4d4d' : currentDieRollSpeed > 0.4 ? '#ff944d' : '#ffd11a',
                            opacity: 0.4 + (currentDieRollSpeed * 0.4),
                            transform: `scale(${1 - currentDieRollSpeed * 0.2})`,
                            boxShadow: `0 0 ${15 * currentDieRollSpeed}px ${currentDieRollSpeed > 0.8 ? '#ff4d4d' : '#ffd11a'}`
                        }}
                    />
                    
                    {/* Flecha de Trayectoria (Hacia donde saldrá disparado) */}
                    <div 
                        className="absolute origin-bottom transition-all duration-75"
                        style={{
                            bottom: '50%',
                            height: `${Math.min(currentDieRollSpeed * 280, 240)}px`,
                            width: '14px',
                            background: `linear-gradient(to top, rgba(255,255,255,0.1), ${currentDieRollSpeed > 0.8 ? '#ff4d4d' : '#ffd11a'})`,
                            borderRadius: '10px 10px 0 0',
                            transform: `rotate(${dragDirection}deg)`,
                            filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.4))'
                        }}
                    >
                        {/* Punta de la flecha reforzada */}
                        <div 
                            className="absolute -top-4 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[22px]"
                            style={{ borderBottomColor: currentDieRollSpeed > 0.8 ? '#ff4d4d' : '#ffd11a' }}
                        />
                        
                        {/* Líneas de velocidad en la flecha */}
                        <div className="absolute inset-0 flex flex-col justify-around py-4 opacity-30">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-full h-[2px] bg-white/50" />
                            ))}
                        </div>
                    </div>

                    {/* Badge de Potencia */}
                    <div 
                        className="absolute -top-20 bg-black/95 px-4 py-2 rounded-xl border-2 shadow-2xl transition-transform"
                        style={{ 
                            borderColor: currentDieRollSpeed > 0.8 ? '#ff4d4d' : '#ffd11a',
                            transform: `scale(${1 + currentDieRollSpeed * 0.15}) translateY(${currentDieRollSpeed * -10}px)`,
                            boxShadow: `0 10px 25px rgba(0,0,0,0.6), 0 0 15px ${currentDieRollSpeed > 0.8 ? 'rgba(255,77,77,0.3)' : 'rgba(255,209,26,0.2)'}`
                        }}
                    >
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Tensión</span>
                            <span className="text-[16px] font-black font-mono leading-none" style={{ color: currentDieRollSpeed > 0.8 ? '#ff4d4d' : '#ffd11a' }}>
                                {Math.round(Math.min(currentDieRollSpeed, 1) * 100)}%
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div
                className="absolute inset-0 transition-transform duration-300 ease-out"
                style={{
                    transform: isDragging ? 'translateY(-8px) scale(1.06) rotateX(8deg)' : 'translateY(0) scale(1)',
                    transformStyle: 'preserve-3d',
                }}
            >
                <BoardDie3d sides={sides} color={color} rotationRef={rotationRef} renderRequestRef={renderRequestRef} />
            </div>
            {showD4FloatingResult && (
                <div className="absolute inset-0 z-[70] pointer-events-none flex items-center justify-center">
                    <div
                        className="relative -translate-y-[38%] min-w-[1.75rem] h-7 px-2 rounded-full border border-[#f8e7b9]/80 bg-[#07070a]/88 shadow-[0_8px_20px_rgba(0,0,0,0.55),0_0_16px_rgba(200,170,110,0.28)] flex items-center justify-center"
                        aria-hidden="true"
                    >
                        <span className="font-serif text-[1.15rem] leading-none font-black text-[#f8e7b9] drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
                            {displayValue}
                        </span>
                        <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-r border-b border-[#f8e7b9]/70 bg-[#07070a]/88" />
                    </div>
                </div>
            )}
        </div>
    );
};

export const BoardMarkerVisual = ({ marker, className = '', renderCoin = true, showOverlay = true, stackIndex = 0, isDragging = false }) => {
    const markerColor = marker?.markerColor || '#c8aa6e';
    const markerValue = Number.isFinite(Number(marker?.markerValue)) ? Number(marker.markerValue) : 1;
    const markerSize = Math.min(Number(marker?.width) || 80, Number(marker?.height) || 80);
    const hasValue = markerValue > 0;
    const fillColor = hasValue ? markerColor : '#e7e1d5';
    const fontSize = Math.max(10, Math.min(30, markerSize * 0.5));
    const textColor = getReadableMarkerTextColor(fillColor);
    const lift = Math.min(18, (stackIndex * 4) + (isDragging ? 7 : 0));
    const shadowOpacity = Math.min(0.72, 0.46 + (stackIndex * 0.08) + (isDragging ? 0.12 : 0));

    return (
        <div className={`relative h-full w-full rounded-full ${className}`} style={{ perspective: 320 }}>
            <div
                className="absolute inset-0 rounded-full transition-transform duration-300 ease-out"
                style={{
                    transform: `translateY(${-lift}px) ${isDragging ? 'scale(1.06) rotateX(10deg)' : stackIndex > 0 ? 'scale(1.015)' : 'scale(1)'}`,
                    transformStyle: 'preserve-3d',
                }}
            >
                {renderCoin && (
                    <>
                        <div
                            className="absolute inset-[8%] translate-y-[18%] rounded-full blur-[7px]"
                            style={{ backgroundColor: `rgba(0,0,0,${shadowOpacity})` }}
                            aria-hidden="true"
                        />
                        <BoardMarker3dCoin fillColor={fillColor} />
                    </>
                )}
                {!renderCoin && (
                    <div
                        className="absolute inset-0 rounded-full opacity-95 shadow-[0_8px_14px_rgba(0,0,0,0.55)]"
                        style={{
                            background: `radial-gradient(circle at 38% 34%, rgba(255,255,255,0.18), transparent 28%), ${fillColor}`,
                            border: '1px solid rgba(5,7,13,0.7)',
                        }}
                        aria-hidden="true"
                    />
                )}
                {showOverlay && hasValue && (
                    <span
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-fantasy leading-none"
                        style={{ fontSize: `${fontSize}px`, color: textColor }}
                    >
                        {markerValue}
                    </span>
                )}
            </div>
        </div>
    );
};

