export function setupFullscreenCamera({layout, stage, video, cameraButton, toggleButton, announce}) {
  const cameraBox = video.closest('.camera-box');
  const previewButton = document.createElement('button');
  previewButton.type = 'button';
  previewButton.className = 'fullscreen-camera-toggle';
  previewButton.addEventListener('click', () => cameraButton.click());
  cameraBox.append(previewButton);

  function syncCameraButton() {
    previewButton.textContent = cameraButton.textContent;
    previewButton.disabled = cameraButton.disabled;
  }

  function positionPreview() {
    if (document.fullscreenElement !== layout) return;
    const bounds = stage.getBoundingClientRect();
    const width = Math.max(80, Math.min(224, Math.max(120, window.innerWidth * .18),
      window.innerWidth * .32, bounds.height * .60));
    layout.style.setProperty('--fullscreen-preview-width', `${Math.round(width)}px`);
    layout.style.setProperty('--fullscreen-preview-bottom',
      `${Math.max(12, Math.round(window.innerHeight - bounds.bottom + 12))}px`);
  }

  function updateFullscreen() {
    const active = document.fullscreenElement === layout;
    toggleButton.setAttribute('aria-pressed', String(active));
    toggleButton.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
    positionPreview();
  }

  toggleButton.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (layout.requestFullscreen) {
        await layout.requestFullscreen();
      } else {
        announce('Fullscreen is not available in this browser.');
      }
    } catch {
      announce('Fullscreen is not available in this browser.');
    }
  });

  document.addEventListener('fullscreenchange', updateFullscreen);
  window.addEventListener('resize', positionPreview);
  new ResizeObserver(positionPreview).observe(stage);
  new MutationObserver(syncCameraButton).observe(cameraButton, {
    childList: true, subtree: true, characterData: true,
    attributes: true, attributeFilter: ['disabled']
  });
  syncCameraButton();
  updateFullscreen();
}
