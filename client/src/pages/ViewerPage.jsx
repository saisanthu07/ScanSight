import { Suspense, useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Html, BakeShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, RotateCcw, ZoomIn, ZoomOut, Layers,
  Target, ArrowLeft, Download, Maximize2, Info
} from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-toastify';
import './ViewerPage.css';

// ─── 3D Components ─────────────────────────────────────────────────────────

/**
 * Generates a procedural organ mesh based on label and color
 */
function OrganMesh({ label, color, position, scale, opacity, isHighlighted, isTumor }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (!meshRef.current) return;
    if (isHighlighted || isTumor) {
      meshRef.current.material.emissiveIntensity =
        0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }
    if (hovered) {
      meshRef.current.scale.setScalar(
        (scale[0] || 1) * (1 + Math.sin(state.clock.elapsedTime * 3) * 0.02)
      );
    }
  });

  const geometry = useMemo(() => {
    const lbl = label.toLowerCase();
    if (lbl.includes('lung')) return new THREE.CapsuleGeometry(0.6, 1.2, 8, 16);
    if (lbl.includes('heart')) return new THREE.SphereGeometry(0.5, 16, 12);
    if (lbl.includes('brain')) return new THREE.SphereGeometry(0.85, 24, 20);
    if (lbl.includes('liver')) return new THREE.CapsuleGeometry(0.9, 0.5, 8, 12);
    if (lbl.includes('kidney')) return new THREE.CapsuleGeometry(0.3, 0.6, 6, 10);
    if (lbl.includes('spleen')) return new THREE.SphereGeometry(0.4, 12, 10);
    if (lbl.includes('spine') || lbl.includes('cord')) return new THREE.CylinderGeometry(0.1, 0.1, 3, 8);
    if (lbl.includes('aorta') || lbl.includes('artery')) return new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 1, 0)]), 20, 0.08, 8
    );
    if (lbl.includes('trachea')) return new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8);
    if (lbl.includes('tumor') || lbl.includes('lesion') || lbl.includes('nodule')) {
      return new THREE.SphereGeometry(0.2 + Math.random() * 0.15, 16, 12);
    }
    return new THREE.SphereGeometry(0.3 + Math.random() * 0.2, 10, 8);
  }, [label]);

  const material = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    roughness: isTumor ? 0.8 : 0.3,
    metalness: 0.1,
    emissive: new THREE.Color(isTumor ? '#FF0000' : isHighlighted ? '#00FFFF' : color),
    emissiveIntensity: isTumor ? 0.5 : isHighlighted ? 0.3 : 0.05,
    side: THREE.DoubleSide,
    depthWrite: opacity > 0.8,
  }), [color, opacity, isTumor, isHighlighted]);

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        scale={scale}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        {(hovered || isTumor) && (
          <Html distanceFactor={10} center>
            <div className="organ-tooltip">
              <strong>{label}</strong>
              {isTumor && <span style={{ color: '#FF4444' }}>⚠ Suspicious Lesion</span>}
            </div>
          </Html>
        )}
      </mesh>
      {isTumor && (
        <mesh scale={[scale[0] * 1.3, scale[1] * 1.3, scale[2] * 1.3]}>
          <sphereGeometry args={[0.22, 12, 10]} />
          <meshBasicMaterial color="#FF4444" transparent opacity={0.08} wireframe />
        </mesh>
      )}
    </group>
  );
}

/**
 * Body outline / wireframe shell
 */
function BodyOutline({ bodyPart }) {
  const positions = {
    chest: { geo: new THREE.CapsuleGeometry(1.1, 2, 8, 16), pos: [0, 0, 0] },
    brain: { geo: new THREE.SphereGeometry(1.2, 20, 16), pos: [0, 0, 0] },
    abdomen: { geo: new THREE.CapsuleGeometry(1.2, 1.5, 8, 16), pos: [0, 0, 0] },
    default: { geo: new THREE.CapsuleGeometry(1.1, 2, 8, 16), pos: [0, 0, 0] },
  };

  const { geo, pos } = positions[bodyPart] || positions.default;

  return (
    <mesh position={pos} geometry={geo}>
      <meshBasicMaterial color="#00D4FF" transparent opacity={0.05} wireframe />
    </mesh>
  );
}

/**
 * Animated scan grid lines
 */
function ScanGrid() {
  const ref = useRef();
  useFrame((state) => {
    if (ref.current) ref.current.position.y = ((state.clock.elapsedTime * 0.3) % 4) - 2;
  });

  return (
    <group ref={ref}>
      <gridHelper args={[8, 20, '#00D4FF', '#00D4FF']} rotation={[0, 0, 0]} />
    </group>
  );
}

/**
 * Scene lighting
 */
function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} color="#ffffff" castShadow />
      <directionalLight position={[-5, 3, -5]} intensity={0.3} color="#00D4FF" />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#8B5CF6" />
      <pointLight position={[0, -3, 0]} intensity={0.2} color="#00D4FF" />
    </>
  );
}

// ─── Main Viewer ─────────────────────────────────────────────────────────────

export default function ViewerPage() {
  const { analysisId } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [visibleOrgans, setVisibleOrgans] = useState({});
  const [opacities, setOpacities] = useState({});
  const [tumorHighlight, setTumorHighlight] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [selectedOrgan, setSelectedOrgan] = useState(null);
  const controlsRef = useRef();

  useEffect(() => {
    loadAnalysis();
  }, [analysisId]);

  const loadAnalysis = async () => {
    try {
      const { data } = await api.get(`/analysis/results/${analysisId}`);
      const a = data.data.analysis;
      setAnalysis(a);

      // Initialize visibility/opacity
      const vis = {}, ops = {};
      const segments = a.results?.segmentation?.masks || [];
      segments.forEach((s) => {
        vis[s.label] = true;
        ops[s.label] = s.opacity || 0.6;
      });
      if (a.results?.findings) {
        a.results.findings.forEach((f) => {
          vis[f.label] = true;
          ops[f.label] = 0.9;
        });
      }
      setVisibleOrgans(vis);
      setOpacities(ops);
    } catch {
      toast.error('Failed to load analysis for 3D viewer');
    } finally {
      setLoading(false);
    }
  };

  const toggleOrgan = (label) => {
    setVisibleOrgans((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const resetCamera = () => controlsRef.current?.reset();

  /**
   * Generate positions for organs in 3D space based on body part
   */
  const getOrganPosition = (label, index, total, bodyPart) => {
    const lbl = label.toLowerCase();
    const positions = {
      // Chest
      'right lung': [0.7, 0, 0],
      'left lung': [-0.7, 0, 0],
      'lung_right': [0.7, 0, 0],
      'lung_left': [-0.7, 0, 0],
      'heart': [0.1, -0.2, 0.3],
      'aorta': [0.05, 0.3, 0.1],
      'trachea': [0, 1.2, 0.2],
      'esophagus': [0.05, 0.5, -0.2],
      'thoracic spine': [0, 0, -0.8],
      // Brain
      'cerebrum': [0, 0.2, 0],
      'cerebellum': [0, -0.6, -0.3],
      'brain stem': [0, -0.9, 0],
      'thalamus': [0, 0, 0.1],
      'ventricles': [0, 0.1, 0],
      // Abdomen
      'liver': [0.6, 0.3, 0],
      'spleen': [-0.7, 0.2, 0],
      'kidney_left': [-0.7, -0.3, -0.4],
      'kidney_right': [0.7, -0.3, -0.4],
      'left kidney': [-0.7, -0.3, -0.4],
      'right kidney': [0.7, -0.3, -0.4],
      'pancreas': [0, 0, 0.3],
      'gallbladder': [0.5, 0.05, 0.3],
      'stomach': [-0.2, 0.1, 0.3],
    };

    for (const [key, pos] of Object.entries(positions)) {
      if (lbl.includes(key.toLowerCase())) return pos;
    }

    // Grid fallback
    const cols = 3;
    const x = ((index % cols) - 1) * 0.8;
    const y = Math.floor(index / cols) * 0.8 - 0.4;
    const z = (Math.random() - 0.5) * 0.4;
    return [x, y, z];
  };

  const getOrganScale = (label) => {
    const lbl = label.toLowerCase();
    if (lbl.includes('liver')) return [1.5, 1.2, 1.0];
    if (lbl.includes('lung')) return [1.0, 1.4, 0.8];
    if (lbl.includes('heart')) return [0.9, 0.9, 0.9];
    if (lbl.includes('brain') || lbl.includes('cerebrum')) return [1.2, 1.0, 1.2];
    if (lbl.includes('spleen')) return [0.7, 0.8, 0.7];
    if (lbl.includes('tumor') || lbl.includes('lesion') || lbl.includes('nodule')) return [0.8, 0.8, 0.8];
    return [0.8, 0.8, 0.8];
  };

  if (loading) {
    return (
      <div className="viewer-loading flex-center">
        <div className="flex-col flex-center gap-4">
          <div className="spinner spinner-lg" />
          <p>Loading 3D visualization...</p>
        </div>
      </div>
    );
  }

  const segments = analysis?.results?.segmentation?.masks || [];
  const findings = analysis?.results?.findings || [];
  const bodyPart = analysis?.scanId?.bodyPart || 'chest';
  const tumorDetected = analysis?.results?.tumorDetection?.detected;
  const totalItems = segments.length + findings.length;

  return (
    <div className="viewer-page">
      {/* Header */}
      <div className="viewer-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back to Analysis
        </button>
        <div className="viewer-title">
          <Layers size={18} />
          <span>3D Anatomy Viewer</span>
          <span className="badge badge-info">NVIDIA VISTA-3D</span>
          {tumorDetected && <span className="badge badge-danger">⚠ Tumor Detected</span>}
        </div>
        <div className="viewer-controls-bar">
          <button className="btn btn-secondary btn-sm" onClick={resetCamera}>
            <RotateCcw size={14} /> Reset View
          </button>
          <button
            className={`btn btn-sm ${tumorHighlight ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => setTumorHighlight(!tumorHighlight)}
          >
            <Target size={14} /> {tumorHighlight ? 'Tumor ON' : 'Tumor OFF'}
          </button>
        </div>
      </div>

      <div className="viewer-layout">
        {/* Canvas */}
        <div className="canvas-wrapper">
          <Canvas
            camera={{ position: [0, 0, 5], fov: 50 }}
            shadows
            gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
            dpr={[1, 2]}
          >
            <color attach="background" args={['#050A14']} />
            <fog attach="fog" args={['#050A14', 10, 25]} />

            <SceneLighting />

            <Suspense fallback={null}>
              {/* Body outline */}
              <BodyOutline bodyPart={bodyPart} />

              {/* Scan grid animation */}
              <ScanGrid />

              {/* Organ segments */}
              {segments.map((seg, i) => {
                if (!visibleOrgans[seg.label]) return null;
                const isTumor = false;
                return (
                  <OrganMesh
                    key={seg.label}
                    label={seg.label}
                    color={seg.color || '#00D4FF'}
                    position={getOrganPosition(seg.label, i, totalItems, bodyPart)}
                    scale={getOrganScale(seg.label)}
                    opacity={opacities[seg.label] || 0.6}
                    isHighlighted={selectedOrgan === seg.label}
                    isTumor={isTumor}
                  />
                );
              })}

              {/* Findings / Tumors */}
              {findings.map((f, i) => {
                if (!visibleOrgans[f.label]) return null;
                return (
                  <OrganMesh
                    key={`finding-${i}`}
                    label={f.label || f.type}
                    color={tumorHighlight ? '#FF4444' : (f.color || '#FF8800')}
                    position={
                      f.location?.coordinates
                        ? [
                            (f.location.coordinates.x / 512 - 0.5) * 3,
                            (f.location.coordinates.y / 512 - 0.5) * 3,
                            (f.location.coordinates.z / 200 - 0.5) * 2,
                          ]
                        : [Math.random() * 0.5, Math.random() * 0.5, Math.random() * 0.5]
                    }
                    scale={[0.6, 0.6, 0.6]}
                    opacity={0.9}
                    isHighlighted={tumorHighlight}
                    isTumor={true}
                  />
                );
              })}

              <OrbitControls
                ref={controlsRef}
                enableDamping
                dampingFactor={0.05}
                minDistance={2}
                maxDistance={12}
                makeDefault
              />
            </Suspense>
          </Canvas>

          {/* Overlay info */}
          <div className="canvas-overlay">
            <div className="viewer-info-badge">
              <Info size={12} />
              <span>Drag to rotate · Scroll to zoom · Right-click to pan</span>
            </div>
            {tumorDetected && tumorHighlight && (
              <div className="tumor-alert">
                <Target size={14} />
                <span>Suspicious lesion highlighted in red</span>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="viewer-sidebar">
          <div className="sidebar-section">
            <h4>Structures ({totalItems})</h4>
            <div className="organ-list">
              {segments.map((seg) => (
                <div
                  key={seg.label}
                  className={`organ-list-item ${selectedOrgan === seg.label ? 'selected' : ''} ${!visibleOrgans[seg.label] ? 'hidden' : ''}`}
                  onClick={() => setSelectedOrgan(selectedOrgan === seg.label ? null : seg.label)}
                >
                  <div className="organ-color-dot" style={{ background: seg.color }} />
                  <span className="organ-list-name">{seg.label}</span>
                  <button
                    className="btn btn-icon btn-ghost"
                    style={{ padding: 4 }}
                    onClick={(e) => { e.stopPropagation(); toggleOrgan(seg.label); }}
                  >
                    {visibleOrgans[seg.label] ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>
                </div>
              ))}

              {/* Findings */}
              {findings.length > 0 && (
                <>
                  <div className="list-divider">
                    <span>Findings ({findings.length})</span>
                  </div>
                  {findings.map((f, i) => (
                    <div
                      key={`f-${i}`}
                      className="organ-list-item finding-entry"
                      onClick={() => setSelectedOrgan(f.label)}
                    >
                      <div className="organ-color-dot" style={{ background: '#FF4444' }} />
                      <span className="organ-list-name">{f.label || f.type}</span>
                      <span className={`badge badge-${f.severity === 'high' ? 'danger' : 'warning'} badge-xs`}>
                        {f.severity}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Selected Organ Info */}
          {selectedOrgan && (
            <div className="sidebar-section selected-info">
              <h4>Selected: {selectedOrgan}</h4>
              {(() => {
                const seg = segments.find((s) => s.label === selectedOrgan);
                const finding = findings.find((f) => f.label === selectedOrgan);
                if (seg) return (
                  <div className="organ-details">
                    {seg.volumeCC && <div className="detail-row"><span>Volume</span><strong>{seg.volumeCC} cm³</strong></div>}
                    <div className="detail-row">
                      <span>Opacity</span>
                      <input type="range" min="10" max="100"
                        value={Math.round((opacities[selectedOrgan] || 0.6) * 100)}
                        onChange={(e) => setOpacities(prev => ({
                          ...prev, [selectedOrgan]: e.target.value / 100
                        }))}
                        style={{ flex: 1, marginLeft: 8 }}
                      />
                    </div>
                  </div>
                );
                if (finding) return (
                  <div className="organ-details">
                    {finding.measurements?.diameter && (
                      <div className="detail-row"><span>Diameter</span><strong>{finding.measurements.diameter}mm</strong></div>
                    )}
                    {finding.measurements?.volume && (
                      <div className="detail-row"><span>Volume</span><strong>{finding.measurements.volume} cm³</strong></div>
                    )}
                    <div className="detail-row"><span>Confidence</span>
                      <strong>{Math.round((finding.confidence || 0) * 100)}%</strong></div>
                    {finding.description && <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 8 }}>{finding.description}</p>}
                  </div>
                );
                return null;
              })()}
            </div>
          )}

          {/* Overall Info */}
          <div className="sidebar-section model-info">
            <h4>Analysis Info</h4>
            <div className="organ-details">
              <div className="detail-row"><span>Model</span><strong>NVIDIA VISTA-3D</strong></div>
              <div className="detail-row"><span>Body Part</span><strong style={{ textTransform: 'capitalize' }}>{bodyPart}</strong></div>
              <div className="detail-row">
                <span>Confidence</span>
                <strong>{Math.round((analysis?.results?.overallAssessment?.aiConfidence || 0) * 100)}%</strong>
              </div>
              <div className="detail-row">
                <span>Structures</span>
                <strong>{segments.length}</strong>
              </div>
              {tumorDetected && (
                <div className="detail-row">
                  <span>Tumor</span>
                  <span className="badge badge-danger">Detected</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
