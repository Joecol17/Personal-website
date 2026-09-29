// Lightweight HDR bloom: the scene renders into a multisampled half-float target, bright
// pixels (the RGB lighting) are blurred down a small mip chain, and a final pass adds the
// glow back, then applies the renderer's tone mapping and sRGB output.

const VERT = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export function createBloom(THREE, renderer, { levels = 5, samples = 4, strength = 0.7, threshold = 1.2 } = {}) {
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  const opts = { type: THREE.HalfFloatType, depthBuffer: false };
  const sceneRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples });
  const bright = new THREE.WebGLRenderTarget(1, 1, opts);
  const mipsH = [];
  const mipsV = [];
  for (let i = 0; i < levels; i++) {
    mipsH.push(new THREE.WebGLRenderTarget(1, 1, opts));
    mipsV.push(new THREE.WebGLRenderTarget(1, 1, opts));
  }

  const highPass = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, threshold: { value: threshold } },
    vertexShader: VERT,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse; uniform float threshold; varying vec2 vUv;
      void main() {
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        float l = max(c.r, max(c.g, c.b));
        float k = smoothstep(threshold, threshold * 1.6, l);
        gl_FragColor = vec4(min(c * k, vec3(24.0)), 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });

  const blur = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, texel: { value: new THREE.Vector2() }, dir: { value: new THREE.Vector2() } },
    vertexShader: VERT,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse; uniform vec2 texel; uniform vec2 dir; varying vec2 vUv;
      void main() {
        // 9-tap Gaussian using linear filtering (5 fetches)
        vec2 o1 = dir * texel * 1.3846153846;
        vec2 o2 = dir * texel * 3.2307692308;
        vec3 c = texture2D(tDiffuse, vUv).rgb * 0.2270270270;
        c += texture2D(tDiffuse, vUv + o1).rgb * 0.3162162162;
        c += texture2D(tDiffuse, vUv - o1).rgb * 0.3162162162;
        c += texture2D(tDiffuse, vUv + o2).rgb * 0.0702702703;
        c += texture2D(tDiffuse, vUv - o2).rgb * 0.0702702703;
        gl_FragColor = vec4(c, 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });

  const mipUniforms = {};
  let sum = "";
  for (let i = 0; i < levels; i++) {
    mipUniforms[`tB${i}`] = { value: mipsV[i].texture };
    sum += `b += texture2D(tB${i}, vUv).rgb * ${(1.0 - i * 0.12).toFixed(3)};\n`;
  }
  const output = new THREE.ShaderMaterial({
    uniforms: { tScene: { value: sceneRT.texture }, strength: { value: strength }, ...mipUniforms },
    vertexShader: VERT,
    fragmentShader: /* glsl */ `
      uniform sampler2D tScene; uniform float strength;
      ${Object.keys(mipUniforms).map((k) => `uniform sampler2D ${k};`).join("\n")}
      varying vec2 vUv;
      void main() {
        vec4 s = texture2D(tScene, vUv);
        vec3 b = vec3(0.0);
        ${sum}
        gl_FragColor = vec4(s.rgb + b * strength / ${levels.toFixed(1)}, s.a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    depthTest: false,
    depthWrite: false,
  });

  function pass(material, target) {
    quad.material = material;
    renderer.setRenderTarget(target);
    renderer.render(quad, cam);
  }

  let w = 1;
  let h = 1;
  function setSize(width, height) {
    const pr = renderer.getPixelRatio();
    w = Math.max(1, Math.round(width * pr));
    h = Math.max(1, Math.round(height * pr));
    sceneRT.setSize(w, h);
    let bw = Math.max(1, w >> 1);
    let bh = Math.max(1, h >> 1);
    bright.setSize(bw, bh);
    for (let i = 0; i < levels; i++) {
      mipsH[i].setSize(bw, bh);
      mipsV[i].setSize(bw, bh);
      bw = Math.max(1, bw >> 1);
      bh = Math.max(1, bh >> 1);
    }
  }

  function render(scene, camera, glow = 1) {
    renderer.setRenderTarget(sceneRT);
    renderer.clear();
    renderer.render(scene, camera);
    if (glow > 0.001) {
      highPass.uniforms.tDiffuse.value = sceneRT.texture;
      pass(highPass, bright);
      let src = bright;
      for (let i = 0; i < levels; i++) {
        const t = mipsH[i];
        blur.uniforms.tDiffuse.value = src.texture;
        blur.uniforms.texel.value.set(1 / src.width, 1 / src.height);
        blur.uniforms.dir.value.set(1, 0);
        pass(blur, t);
        blur.uniforms.tDiffuse.value = t.texture;
        blur.uniforms.texel.value.set(1 / t.width, 1 / t.height);
        blur.uniforms.dir.value.set(0, 1);
        pass(blur, mipsV[i]);
        src = mipsV[i];
      }
    }
    output.uniforms.strength.value = strength * glow;
    pass(output, null);
  }

  return {
    setSize,
    render,
    set strength(v) {
      strength = v;
    },
    get strength() {
      return strength;
    },
  };
}
