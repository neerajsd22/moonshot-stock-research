import {
  ParticleNetwork,
  AuroraBorealis,
  MatrixRain,
  BokehBlur,
  NoiseGradient,
  MeshGradient,
} from './AnimatedBackground';

// Background options for selection in settings/picker
export const BACKGROUND_OPTIONS = {
  particles: { name: 'Particle Network', component: ParticleNetwork, description: 'Connected dots that react to mouse' },
  aurora: { name: 'Aurora Borealis', component: AuroraBorealis, description: 'Slow-moving northern lights effect' },
  matrix: { name: 'Matrix Rain', component: MatrixRain, description: 'Subtle falling financial symbols' },
  bokeh: { name: 'Bokeh Blur', component: BokehBlur, description: 'Out-of-focus city lights effect' },
  noise: { name: 'Noise Gradient', component: NoiseGradient, description: 'Modern grainy texture with color shifts' },
  mesh: { name: 'Mesh Gradient', component: MeshGradient, description: 'Smooth animated color blobs' },
  none: { name: 'None', component: () => null, description: 'No animated background' },
};

export default BACKGROUND_OPTIONS;
