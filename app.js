/**
 * Genetics Family Tree Editor (유전 가계도 에디터)
 * Full Interactive JavaScript Application Engine
 */

class GeneticsPedigreeApp {
  constructor() {
    // Canvas & State
    this.nodes = [];
    this.connections = [];
    this.phenotypes = [];
    
    this.selectedNodeId = null;
    this.selectedConnectionId = null;
    this.activeMode = 'select'; // 'select', 'add-male', 'add-female', 'connect-spouse', 'connect-child'
    this.connectSourceId = null;

    // Viewport transform (Pan & Zoom)
    this.scale = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.startPanPos = { x: 0, y: 0 };
    
    // Snap to grid option
    this.snapToGrid = true;
    this.gridSize = 20;
    this.gridStepX = 10; // 1/2 grid horizontal step (10px)
    this.gridStepY = 20; // Vertical grid step (20px)

    // History (Undo / Redo)
    this.undoStack = [];
    this.redoStack = [];

    // Double-click inline editor target
    this.editingNodeId = null;

    // Nodes shape sizing
    this.nodeSize = 54; // Width / Height of male square or female circle radius * 2

    // Font size & Label Naming settings
    this.labelFontSize = 15;
    this.genotypeFontSize = 16;
    this.labelNamingFormat = 'korean';
    this.grayDarkness = 20;
    this.questionMarkStyle = 'overlay'; // 'overlay' (inside square/circle shape) or 'standalone' (only ?)

    // Legend Drag & Custom Texts & Width state
    this.legendPos = null;
    this.isDraggingLegend = false;
    this.legendDragOffset = { x: 0, y: 0 };
    this.legendAutoWidth = true;
    this.legendWidth = 180;
    this.legendLayout = '2col'; // '2col' (left 2, right 2, 2 rows) or '1col' (vertical 4 rows)
    this.legendVisibleItems = [true, true, true, true]; // Checkbox state for 4 items
    this.legendTexts = [
      '흰색 (기본 / 정상) (여)',
      '흰색 (기본 / 정상) (남)',
      '회색 (발현 / 유전병) (여)',
      '회색 (발현 / 유전병) (남)'
    ];

    // Elements cache
    this.initElements();
    this.initPhenotypes();
    this.bindEvents();
    this.drawGrid();

    // Load initial sample template (Matching the user's uploaded picture!)
    this.loadSampleTemplate();
  }

  initElements() {
    this.container = document.getElementById('canvas-container');
    this.svg = document.getElementById('svg-canvas');
    this.viewportGroup = document.getElementById('viewport-group');
    this.gridGroup = document.getElementById('grid-group');
    this.connectionsGroup = document.getElementById('connections-group');
    this.nodesGroup = document.getElementById('nodes-group');
    this.legendGroup = document.getElementById('legend-group');

    // Tool Buttons
    this.btnTemplateSample = document.getElementById('btn-template-sample');
    this.btnClear = document.getElementById('btn-clear');
    this.btnUndo = document.getElementById('btn-undo');
    this.btnRedo = document.getElementById('btn-redo');
    this.btnSnapGrid = document.getElementById('btn-snap-grid');
    this.btnZoomIn = document.getElementById('btn-zoom-in');
    this.btnZoomOut = document.getElementById('btn-zoom-out');
    this.btnZoomReset = document.getElementById('btn-zoom-reset');
    this.btnSaveJson = document.getElementById('btn-save-json');
    this.btnLoadJson = document.getElementById('btn-load-json');

    // Font Size & Naming & Gray Shade & Question Style & Legend controls
    this.inputLabelFontSize = document.getElementById('input-label-font-size');
    this.inputGenotypeFontSize = document.getElementById('input-genotype-font-size');
    this.valLabelFontSize = document.getElementById('val-label-font-size');
    this.valGenotypeFontSize = document.getElementById('val-genotype-font-size');
    this.selectLabelNaming = document.getElementById('select-label-naming');
    this.inputGrayDarkness = document.getElementById('input-gray-darkness');
    this.valGrayDarkness = document.getElementById('val-gray-darkness');
    this.selectQuestionStyle = document.getElementById('select-question-style');
    this.selectLegendLayout = document.getElementById('select-legend-layout');
    this.checkLegendAutoWidth = document.getElementById('check-legend-auto-width');
    this.inputLegendWidth = document.getElementById('input-legend-width');
    this.valLegendWidth = document.getElementById('val-legend-width');

    // Left Toolbar
    this.toolAddMale = document.getElementById('tool-add-male');
    this.toolAddFemale = document.getElementById('tool-add-female');
    this.toolAddQuestion = document.getElementById('tool-add-question');
    this.toolConnectSpouse = document.getElementById('tool-connect-spouse');
    this.toolConnectChild = document.getElementById('tool-connect-child');
    this.toolSelectMode = document.getElementById('tool-select-mode');

    // Inspector Quick Question Button
    this.btnQuickQuestion = document.getElementById('btn-quick-question');

    // Mode Banner
    this.modeBanner = document.getElementById('mode-banner');
    this.modeBannerText = document.getElementById('mode-banner-text');
    this.btnCancelMode = document.getElementById('btn-cancel-mode');

    // Grid & Legend toggles
    this.toggleGrid = document.getElementById('toggle-grid');
    this.toggleLegend = document.getElementById('toggle-legend');

    // Inline Editor
    this.inlineEditor = document.getElementById('inline-editor');
    this.inlineInput = document.getElementById('inline-input');
    this.inlineClose = document.getElementById('inline-close');
    this.inlineSave = document.getElementById('inline-save');
    this.quickBtns = document.querySelectorAll('.q-btn');

    // Inspector
    this.noSelectionMsg = document.getElementById('no-selection-msg');
    this.nodeInspector = document.getElementById('node-inspector');
    this.connectionInspector = document.getElementById('connection-inspector');
    this.inputNodeLabel = document.getElementById('input-node-label');
    this.inputNodeGenotype = document.getElementById('input-node-genotype');
    this.radioGenders = document.querySelectorAll('input[name="node-gender"]');
    this.selectNodePhenotype = document.getElementById('select-node-phenotype');
    this.selectNodeQuestionStyle = document.getElementById('select-node-question-style');
    this.btnDeleteSelected = document.getElementById('btn-delete-selected');
    this.btnDeleteConnection = document.getElementById('btn-delete-connection');
    this.connectionInfoText = document.getElementById('connection-info-text');

    // Status
    this.statusText = document.getElementById('status-text');
    this.statNodeCount = document.getElementById('stat-node-count');
    this.statConnCount = document.getElementById('stat-conn-count');
  }

  getTextWidth(text, font = '13px "Inter", "Malgun Gothic", "Noto Sans KR", sans-serif') {
    const canvas = this._canvasForMeasure || (this._canvasForMeasure = document.createElement('canvas'));
    const context = canvas.getContext('2d');
    context.font = font;
    return context.measureText(text).width;
  }

  getGrayColorHex(percent) {
    const lightness = 100 - percent;
    return `hsl(215, 10%, ${lightness}%)`;
  }

  initPhenotypes() {
    const grayColor = this.getGrayColorHex(this.grayDarkness);
    // Exam Paper White & Gray Phenotypes (흰색과 회색 기본값)
    this.phenotypes = [
      { id: 'trait-white', name: '흰색 (기본 / 정상)', color: '#ffffff', fillMale: '#ffffff', fillFemale: '#ffffff' },
      { id: 'trait-gray', name: '회색 (발현 / 유전병)', color: grayColor, fillMale: grayColor, fillFemale: grayColor }
    ];
  }

  syncLegendInputs() {
    for (let i = 0; i < 4; i++) {
      const input = document.getElementById(`input-legend-${i}`);
      const check = document.getElementById(`check-legend-item-${i}`);
      if (input && this.legendTexts[i] !== undefined) {
        input.value = this.legendTexts[i];
      }
      if (check) {
        const isChecked = !this.legendVisibleItems || this.legendVisibleItems[i] !== false;
        check.checked = isChecked;
        if (input) input.disabled = !isChecked;
        const parentItem = check.closest('.legend-input-item');
        if (parentItem) parentItem.classList.toggle('unchecked', !isChecked);
      }
    }
    if (this.selectQuestionStyle) {
      this.selectQuestionStyle.value = this.questionMarkStyle || 'overlay';
    }
    if (this.selectLegendLayout) {
      this.selectLegendLayout.value = this.legendLayout || '2col';
    }
    if (this.checkLegendAutoWidth) {
      this.checkLegendAutoWidth.checked = !!this.legendAutoWidth;
    }
    if (this.inputLegendWidth) {
      this.inputLegendWidth.value = this.legendWidth || 180;
      this.inputLegendWidth.disabled = !!this.legendAutoWidth;
    }
    if (this.valLegendWidth) {
      this.valLegendWidth.textContent = this.legendAutoWidth ? '자동' : `${this.legendWidth}px`;
    }
  }

  saveHistory() {
    const state = JSON.stringify({
      nodes: this.nodes,
      connections: this.connections,
      phenotypes: this.phenotypes,
      legendPos: this.legendPos,
      legendTexts: this.legendTexts,
      legendLayout: this.legendLayout,
      legendVisibleItems: this.legendVisibleItems,
      legendAutoWidth: this.legendAutoWidth,
      legendWidth: this.legendWidth,
      questionMarkStyle: this.questionMarkStyle
    });

    if (this.undoStack.length === 0 || this.undoStack[this.undoStack.length - 1] !== state) {
      this.undoStack.push(state);
      if (this.undoStack.length > 40) this.undoStack.shift();
      this.redoStack = [];
      this.updateUndoRedoButtons();
    }
  }

  undo() {
    if (this.undoStack.length <= 1) return;
    const currentState = this.undoStack.pop();
    this.redoStack.push(currentState);
    const prevState = JSON.parse(this.undoStack[this.undoStack.length - 1]);
    this.nodes = prevState.nodes;
    this.connections = prevState.connections;
    this.phenotypes = prevState.phenotypes;
    if (prevState.legendPos !== undefined) this.legendPos = prevState.legendPos;
    if (prevState.legendTexts !== undefined) this.legendTexts = prevState.legendTexts;
    if (prevState.legendLayout !== undefined) this.legendLayout = prevState.legendLayout;
    if (prevState.legendVisibleItems !== undefined) this.legendVisibleItems = prevState.legendVisibleItems;
    if (prevState.legendAutoWidth !== undefined) this.legendAutoWidth = prevState.legendAutoWidth;
    if (prevState.legendWidth !== undefined) this.legendWidth = prevState.legendWidth;
    if (prevState.questionMarkStyle !== undefined) this.questionMarkStyle = prevState.questionMarkStyle;
    this.syncLegendInputs();
    this.deselectAll();
    this.renderAll();
    this.updateUndoRedoButtons();
    this.setStatus('실행 취소되었습니다.');
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const nextState = this.redoStack.pop();
    this.undoStack.push(nextState);
    const parsed = JSON.parse(nextState);
    this.nodes = parsed.nodes;
    this.connections = parsed.connections;
    this.phenotypes = parsed.phenotypes;
    if (parsed.legendPos !== undefined) this.legendPos = parsed.legendPos;
    if (parsed.legendTexts !== undefined) this.legendTexts = parsed.legendTexts;
    if (parsed.legendLayout !== undefined) this.legendLayout = parsed.legendLayout;
    if (parsed.legendVisibleItems !== undefined) this.legendVisibleItems = parsed.legendVisibleItems;
    if (parsed.legendAutoWidth !== undefined) this.legendAutoWidth = parsed.legendAutoWidth;
    if (parsed.legendWidth !== undefined) this.legendWidth = parsed.legendWidth;
    if (parsed.questionMarkStyle !== undefined) this.questionMarkStyle = parsed.questionMarkStyle;
    this.syncLegendInputs();
    this.deselectAll();
    this.renderAll();
    this.updateUndoRedoButtons();
    this.setStatus('다시 실행되었습니다.');
  }

  updateUndoRedoButtons() {
    this.btnUndo.disabled = this.undoStack.length <= 1;
    this.btnRedo.disabled = this.redoStack.length === 0;
  }

  bindEvents() {
    // Toolbar & Top actions
    if (this.btnTemplateSample) this.btnTemplateSample.addEventListener('click', () => this.loadSampleTemplate());
    if (this.btnClear) this.btnClear.addEventListener('click', () => this.clearCanvas());
    if (this.btnUndo) this.btnUndo.addEventListener('click', () => this.undo());
    if (this.btnRedo) this.btnRedo.addEventListener('click', () => this.redo());

    if (this.btnSnapGrid) {
      this.btnSnapGrid.addEventListener('click', () => {
        this.snapToGrid = !this.snapToGrid;
        this.btnSnapGrid.classList.toggle('active', this.snapToGrid);
        this.setStatus(`격자 맞춤: ${this.snapToGrid ? '켜짐' : '꺼짐'}`);
      });
    }

    if (this.btnZoomIn) this.btnZoomIn.addEventListener('click', () => this.zoom(1.15));
    if (this.btnZoomOut) this.btnZoomOut.addEventListener('click', () => this.zoom(0.85));
    if (this.btnZoomReset) this.btnZoomReset.addEventListener('click', () => this.resetZoom());

    if (this.btnSaveJson) this.btnSaveJson.addEventListener('click', () => this.saveJSON());
    if (this.btnLoadJson) this.btnLoadJson.addEventListener('change', (e) => this.loadJSON(e));

    // Left tools
    if (this.toolAddMale) this.toolAddMale.addEventListener('click', () => this.setMode('add-male'));
    if (this.toolAddFemale) this.toolAddFemale.addEventListener('click', () => this.setMode('add-female'));
    if (this.toolAddQuestion) {
      this.toolAddQuestion.addEventListener('click', () => this.setMode('add-question'));
    }
    if (this.toolConnectSpouse) this.toolConnectSpouse.addEventListener('click', () => this.setMode('connect-spouse'));
    if (this.toolConnectChild) this.toolConnectChild.addEventListener('click', () => this.setMode('connect-child'));
    if (this.toolSelectMode) this.toolSelectMode.addEventListener('click', () => this.setMode('select'));
    if (this.btnCancelMode) this.btnCancelMode.addEventListener('click', () => this.setMode('select'));

    // Quick Question Button in Inspector
    if (this.btnQuickQuestion) {
      this.btnQuickQuestion.addEventListener('click', () => {
        if (this.selectedNodeId) {
          this.updateSelectedNodeProperty('genotype', '?');
          if (this.inputNodeGenotype) this.inputNodeGenotype.value = '?';
        }
      });
    }

    // Canvas Container Events (Pan & Click)
    this.container.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
    window.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
    window.addEventListener('mouseup', (e) => this.handleCanvasMouseUp(e));
    this.container.addEventListener('wheel', (e) => this.handleCanvasWheel(e), { passive: false });

    // Canvas click to add node if in add mode
    this.svg.addEventListener('click', (e) => this.handleSvgClick(e));

    // Grid & Legend Toggles
    if (this.toggleGrid) {
      this.toggleGrid.addEventListener('change', () => this.drawGrid());
    }
    if (this.toggleLegend) {
      this.toggleLegend.addEventListener('change', () => this.renderLegend());
    }

    // Inline Genotype Editor
    if (this.inlineClose) this.inlineClose.addEventListener('click', () => this.closeInlineEditor());
    if (this.inlineSave) this.inlineSave.addEventListener('click', () => this.saveInlineGenotype());
    if (this.inlineInput) {
      this.inlineInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.saveInlineGenotype();
        if (e.key === 'Escape') this.closeInlineEditor();
      });
    }

    this.quickBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this.inlineInput) return;
        const textToInsert = btn.dataset.text;
        const startPos = this.inlineInput.selectionStart;
        const endPos = this.inlineInput.selectionEnd;
        const val = this.inlineInput.value;
        this.inlineInput.value = val.substring(0, startPos) + textToInsert + val.substring(endPos);
        this.inlineInput.focus();
        this.inlineInput.selectionStart = this.inlineInput.selectionEnd = startPos + textToInsert.length;
      });
    });

    // Inspector Events
    if (this.inputNodeLabel) {
      this.inputNodeLabel.addEventListener('input', (e) => this.updateSelectedNodeProperty('label', e.target.value));
    }
    if (this.inputNodeGenotype) {
      this.inputNodeGenotype.addEventListener('input', (e) => this.updateSelectedNodeProperty('genotype', e.target.value));
    }
    if (this.radioGenders) {
      this.radioGenders.forEach(radio => {
        radio.addEventListener('change', (e) => {
          if (e.target.checked) this.updateSelectedNodeProperty('gender', e.target.value);
        });
      });
    }
    if (this.selectNodePhenotype) {
      this.selectNodePhenotype.addEventListener('change', (e) => this.updateSelectedNodeProperty('phenotypeId', e.target.value));
    }
    if (this.selectNodeQuestionStyle) {
      this.selectNodeQuestionStyle.addEventListener('change', (e) => this.updateSelectedNodeProperty('questionStyle', e.target.value));
    }
    if (this.btnDeleteSelected) {
      this.btnDeleteSelected.addEventListener('click', () => this.deleteSelectedNode());
    }
    if (this.btnDeleteConnection) {
      this.btnDeleteConnection.addEventListener('click', () => this.deleteSelectedConnection());
    }

    // Font Size & Naming & Gray Shade Inspector Events
    if (this.inputLabelFontSize) {
      this.inputLabelFontSize.addEventListener('input', (e) => {
        this.labelFontSize = parseInt(e.target.value, 10);
        this.valLabelFontSize.textContent = `${this.labelFontSize}px`;
        this.renderAll();
      });
    }
    if (this.inputGenotypeFontSize) {
      this.inputGenotypeFontSize.addEventListener('input', (e) => {
        this.genotypeFontSize = parseInt(e.target.value, 10);
        this.valGenotypeFontSize.textContent = `${this.genotypeFontSize}px`;
        this.renderAll();
      });
    }
    if (this.selectLabelNaming) {
      this.selectLabelNaming.addEventListener('change', (e) => {
        this.labelNamingFormat = e.target.value;
      });
    }
    if (this.selectQuestionStyle) {
      this.selectQuestionStyle.addEventListener('change', (e) => {
        this.questionMarkStyle = e.target.value;
        this.saveHistory();
        this.renderAll();
      });
    }
    if (this.inputGrayDarkness) {
      this.inputGrayDarkness.addEventListener('input', (e) => {
        this.grayDarkness = parseInt(e.target.value, 10);
        this.valGrayDarkness.textContent = `${this.grayDarkness}%`;
        const grayColor = this.getGrayColorHex(this.grayDarkness);
        const grayPheno = this.phenotypes.find(p => p.id === 'trait-gray');
        if (grayPheno) {
          grayPheno.color = grayColor;
          grayPheno.fillMale = grayColor;
          grayPheno.fillFemale = grayColor;
        }
        document.querySelectorAll('.svg-gray-swatch').forEach(el => {
          el.setAttribute('fill', grayColor);
        });
        this.renderAll();
      });
    }

    if (this.selectLegendLayout) {
      this.selectLegendLayout.addEventListener('change', (e) => {
        this.legendLayout = e.target.value;
        this.saveHistory();
        this.renderLegend();
      });
    }

    if (this.checkLegendAutoWidth) {
      this.checkLegendAutoWidth.addEventListener('change', (e) => {
        this.legendAutoWidth = e.target.checked;
        if (this.inputLegendWidth) this.inputLegendWidth.disabled = this.legendAutoWidth;
        if (this.valLegendWidth) {
          this.valLegendWidth.textContent = this.legendAutoWidth ? '자동' : `${this.legendWidth}px`;
        }
        this.saveHistory();
        this.renderLegend();
      });
    }

    if (this.inputLegendWidth) {
      this.inputLegendWidth.addEventListener('input', (e) => {
        this.legendWidth = parseInt(e.target.value, 10);
        if (this.valLegendWidth) this.valLegendWidth.textContent = `${this.legendWidth}px`;
        this.saveHistory();
        this.renderLegend();
      });
    }

    // 4 Custom Legend Text Input & Checkbox Listeners
    for (let i = 0; i < 4; i++) {
      const input = document.getElementById(`input-legend-${i}`);
      const check = document.getElementById(`check-legend-item-${i}`);

      if (input) {
        input.addEventListener('input', (e) => {
          this.legendTexts[i] = e.target.value;
          this.saveHistory();
          this.renderLegend();
        });
      }

      if (check) {
        check.addEventListener('change', (e) => {
          if (!this.legendVisibleItems) this.legendVisibleItems = [true, true, true, true];
          this.legendVisibleItems[i] = e.target.checked;
          if (input) input.disabled = !e.target.checked;
          const parentItem = check.closest('.legend-input-item');
          if (parentItem) parentItem.classList.toggle('unchecked', !e.target.checked);
          this.saveHistory();
          this.renderLegend();
        });
      }
    }

    // Global Keybindings (Delete, Escape, Ctrl+Z, Ctrl+Y)
    window.addEventListener('keydown', (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.selectedNodeId) this.deleteSelectedNode();
        else if (this.selectedConnectionId) this.deleteSelectedConnection();
      }
      if (e.key === 'Escape') {
        this.setMode('select');
        this.closeInlineEditor();
      }
      if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        this.undo();
      }
      if (e.ctrlKey && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        this.redo();
      }
    });
  }

  // --- Grid Drawing & Pan/Zoom ---
  drawGrid() {
    this.gridGroup.innerHTML = '';
    if (this.toggleGrid && !this.toggleGrid.checked) return;

    const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    pattern.setAttribute('id', 'grid-pattern');
    pattern.setAttribute('width', '20');
    pattern.setAttribute('height', '20');
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');

    // Main grid dot (full grid: 20px)
    const circleMain = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circleMain.setAttribute('cx', '10');
    circleMain.setAttribute('cy', '10');
    circleMain.setAttribute('r', '1.2');
    circleMain.setAttribute('fill', '#94a3b8');
    pattern.appendChild(circleMain);

    // Sub grid dot (1/2 grid horizontal guide: 10px)
    const circleSub = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circleSub.setAttribute('cx', '0');
    circleSub.setAttribute('cy', '10');
    circleSub.setAttribute('r', '0.7');
    circleSub.setAttribute('fill', '#cbd5e1');
    pattern.appendChild(circleSub);

    this.gridGroup.appendChild(pattern);

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '100%');
    rect.setAttribute('height', '100%');
    rect.setAttribute('fill', 'url(#grid-pattern)');
    this.gridGroup.appendChild(rect);
  }

  applyTransform() {
    this.viewportGroup.setAttribute('transform', `translate(${this.panX}, ${this.panY}) scale(${this.scale})`);
  }

  zoom(factor) {
    const newScale = Math.min(Math.max(this.scale * factor, 0.4), 2.5);
    const rect = this.container.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    this.panX = cx - (cx - this.panX) * (newScale / this.scale);
    this.panY = cy - (cy - this.panY) * (newScale / this.scale);
    this.scale = newScale;
    this.applyTransform();
  }

  resetZoom() {
    this.scale = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.applyTransform();
  }

  handleCanvasWheel(e) {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const mouseX = e.clientX - this.container.getBoundingClientRect().left;
    const mouseY = e.clientY - this.container.getBoundingClientRect().top;

    const newScale = Math.min(Math.max(this.scale * zoomFactor, 0.4), 2.5);
    this.panX = mouseX - (mouseX - this.panX) * (newScale / this.scale);
    this.panY = mouseY - (mouseY - this.panY) * (newScale / this.scale);
    this.scale = newScale;
    this.applyTransform();
  }

  handleCanvasMouseDown(e) {
    if (e.target.closest('#legend-group')) {
      if (e.button !== 0) return;
      e.stopPropagation();
      this.isDraggingLegend = true;
      const coords = this.screenToCanvasCoords(e.clientX, e.clientY);
      const legX = this.currentLegendPos ? this.currentLegendPos.x : 600;
      const legY = this.currentLegendPos ? this.currentLegendPos.y : 300;
      this.legendDragOffset = { x: coords.x - legX, y: coords.y - legY };
      return;
    }

    if (e.button === 1 || (e.button === 0 && e.altKey) || (e.target === this.svg || e.target.parentNode === this.gridGroup)) {
      this.isPanning = true;
      this.startPanPos = { x: e.clientX - this.panX, y: e.clientY - this.panY };
      this.closeInlineEditor();
      if (e.target === this.svg || e.target.parentNode === this.gridGroup) {
        this.deselectAll();
      }
    }
  }

  handleCanvasMouseMove(e) {
    if (this.isDraggingLegend) {
      const coords = this.screenToCanvasCoords(e.clientX, e.clientY);
      let newX = coords.x - this.legendDragOffset.x;
      let newY = coords.y - this.legendDragOffset.y;

      if (this.snapToGrid) {
        newX = Math.round(newX / this.gridStepX) * this.gridStepX;
        newY = Math.round(newY / this.gridStepY) * this.gridStepY;
      }

      this.legendPos = { x: newX, y: newY };
      this.renderLegend();
      return;
    }

    if (this.isPanning) {
      this.panX = e.clientX - this.startPanPos.x;
      this.panY = e.clientY - this.startPanPos.y;
      this.applyTransform();
      return;
    }

    if (this.draggingNodeId) {
      const coords = this.screenToCanvasCoords(e.clientX, e.clientY);
      let newX = coords.x - this.dragOffset.x;
      let newY = coords.y - this.dragOffset.y;

      if (this.snapToGrid) {
        newX = Math.round(newX / this.gridStepX) * this.gridStepX;
        newY = Math.round(newY / this.gridStepY) * this.gridStepY;
      }

      const node = this.nodes.find(n => n.id === this.draggingNodeId);
      if (node) {
        node.x = newX;
        node.y = newY;
        this.renderAll();
      }
    }
  }

  handleCanvasMouseUp(e) {
    if (this.isDraggingLegend) {
      this.isDraggingLegend = false;
      this.saveHistory();
    }
    if (this.isPanning) {
      this.isPanning = false;
    }
    if (this.draggingNodeId) {
      this.draggingNodeId = null;
      this.saveHistory();
    }
  }

  screenToCanvasCoords(screenX, screenY) {
    const rect = this.container.getBoundingClientRect();
    const x = (screenX - rect.left - this.panX) / this.scale;
    const y = (screenY - rect.top - this.panY) / this.scale;
    return { x, y };
  }

  handleSvgClick(e) {
    if (e.target.closest('.pedigree-node') || e.target.closest('.pedigree-line')) return;

    if (this.activeMode === 'add-male' || this.activeMode === 'add-female' || this.activeMode === 'add-question') {
      const coords = this.screenToCanvasCoords(e.clientX, e.clientY);
      let x = coords.x;
      let y = coords.y;
      if (this.snapToGrid) {
        x = Math.round(x / this.gridStepX) * this.gridStepX;
        y = Math.round(y / this.gridStepY) * this.gridStepY;
      }
      let gender = 'male';
      let genotype = '';
      if (this.activeMode === 'add-female') gender = 'female';
      if (this.activeMode === 'add-question') {
        gender = 'question';
        genotype = '?';
      }
      this.addNode(gender, x, y, undefined, genotype);
      this.setMode('select');
    }
  }

  // --- Modes & Tools ---
  setMode(mode) {
    this.activeMode = mode;
    this.connectSourceId = null;

    this.toolAddMale.classList.toggle('active', mode === 'add-male');
    this.toolAddFemale.classList.toggle('active', mode === 'add-female');
    if (this.toolAddQuestion) this.toolAddQuestion.classList.toggle('active', mode === 'add-question');
    this.toolConnectSpouse.classList.toggle('active', mode === 'connect-spouse');
    this.toolConnectChild.classList.toggle('active', mode === 'connect-child');
    this.toolSelectMode.classList.toggle('active', mode === 'select');

    if (mode === 'connect-spouse') {
      this.modeBannerText.textContent = '부부로 연결할 첫 번째 인물(도형)을 선택하세요.';
      this.modeBanner.classList.remove('hidden');
    } else if (mode === 'connect-child') {
      this.modeBannerText.textContent = '자녀를 등록할 부부 연결선(또는 부모)을 선택한 후 자녀를 클릭하세요.';
      this.modeBanner.classList.remove('hidden');
    } else {
      this.modeBanner.classList.add('hidden');
    }
  }

  setStatus(msg) {
    this.statusText.textContent = msg;
  }

  getKoreanLabel(index) {
    const hangul = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하'];
    if (index < hangul.length) {
      return `(${hangul[index]})`;
    }
    const mainIndex = index % hangul.length;
    const cycle = Math.floor(index / hangul.length);
    return `(${hangul[mainIndex]}${cycle})`;
  }

  getNodeAutoLabel() {
    const count = this.nodes.length;
    if (this.labelNamingFormat === 'korean') {
      return this.getKoreanLabel(count);
    }
    return (count + 1).toString();
  }

  // --- Node & Connection Operations ---
  addNode(gender, x, y, label = null, genotype = '', phenotypeId = 'trait-white') {
    const id = 'node-' + Date.now() + '-' + Math.floor(Math.random()*1000);
    const autoLabel = label !== null ? label : this.getNodeAutoLabel();
    const newNode = {
      id,
      gender,
      x,
      y,
      label: autoLabel,
      genotype,
      phenotypeId
    };

    this.nodes.push(newNode);
    this.saveHistory();
    this.selectNode(id);
    this.renderAll();
    this.setStatus(`${gender === 'male' ? '남성' : '여성'} 인물이 추가되었습니다.`);
    return newNode;
  }

  selectNode(id) {
    this.selectedNodeId = id;
    this.selectedConnectionId = null;
    this.updateInspector();
    this.renderAll();
    if (window.quizEngine && typeof window.quizEngine.highlightNodeInput === 'function') {
      window.quizEngine.highlightNodeInput(id);
    }
  }

  selectConnection(id) {
    this.selectedConnectionId = id;
    this.selectedNodeId = null;
    this.updateInspector();
    this.renderAll();
  }

  deselectAll() {
    this.selectedNodeId = null;
    this.selectedConnectionId = null;
    this.updateInspector();
    this.renderAll();
  }

  deleteSelectedNode() {
    if (!this.selectedNodeId) return;
    const id = this.selectedNodeId;
    this.nodes = this.nodes.filter(n => n.id !== id);
    // Remove related connections
    this.connections = this.connections.filter(c => {
      if (c.type === 'spouse' && (c.spouse1Id === id || c.spouse2Id === id)) return false;
      if (c.type === 'child') {
        c.childrenIds = c.childrenIds.filter(childId => childId !== id);
        return c.childrenIds.length > 0;
      }
      return true;
    });

    this.selectedNodeId = null;
    this.saveHistory();
    this.deselectAll();
    this.renderAll();
    this.setStatus('인물이 삭제되었습니다.');
  }

  deleteSelectedConnection() {
    if (!this.selectedConnectionId) return;
    const id = this.selectedConnectionId;
    this.connections = this.connections.filter(c => c.id !== id);
    this.selectedConnectionId = null;
    this.saveHistory();
    this.deselectAll();
    this.renderAll();
    this.setStatus('연결선이 삭제되었습니다.');
  }

  updateSelectedNodeProperty(prop, value) {
    if (!this.selectedNodeId) return;
    const node = this.nodes.find(n => n.id === this.selectedNodeId);
    if (node) {
      node[prop] = value;

      if (prop === 'gender') {
        if (value === 'question') {
          node.genotype = '?';
          if (this.inputNodeGenotype) this.inputNodeGenotype.value = '?';
        }
      }

      if (prop === 'genotype') {
        if (value !== '?' && node.gender === 'question') {
          // If user entered a non-? genotype while in question mode, switch gender out of 'question'
          node.gender = 'female';
          this.radioGenders.forEach(radio => {
            radio.checked = radio.value === 'female';
          });
        }
      }

      this.saveHistory();
      this.renderAll();
    }
  }

  connectSpouse(node1Id, node2Id) {
    if (node1Id === node2Id) return;
    // Check if connection already exists
    const exists = this.connections.some(c => 
      c.type === 'spouse' && 
      ((c.spouse1Id === node1Id && c.spouse2Id === node2Id) || (c.spouse1Id === node2Id && c.spouse2Id === node1Id))
    );
    if (exists) {
      this.setStatus('이미 부부로 연결되어 있는 두 인물입니다.');
      return;
    }

    const connId = 'conn-spouse-' + Date.now();
    this.connections.push({
      id: connId,
      type: 'spouse',
      spouse1Id: node1Id,
      spouse2Id: node2Id
    });

    this.saveHistory();
    this.setMode('select');
    this.renderAll();
    this.setStatus('부부 연결선이 생성되었습니다.');
  }

  connectChild(spouseConnId, childNodeId) {
    // Find existing child connection for this spouse connection
    let conn = this.connections.find(c => c.spouseConnId === spouseConnId && c.type === 'child');
    if (!conn) {
      // Create new child connection for this spouse connection
      conn = {
        id: 'conn-child-' + Date.now(),
        type: 'child',
        spouseConnId: spouseConnId,
        childrenIds: []
      };
      this.connections.push(conn);
    }

    if (!conn.childrenIds.includes(childNodeId)) {
      conn.childrenIds.push(childNodeId);
    }

    this.saveHistory();
    this.setMode('select');
    this.renderAll();
    this.setStatus('자녀가 성공적으로 연결되었습니다.');
  }

  // --- Inline Double-Click Genotype Editor ---
  openInlineEditor(node, screenX, screenY) {
    this.editingNodeId = node.id;
    this.inlineInput.value = node.genotype || '';
    
    const containerRect = this.container.getBoundingClientRect();
    const left = screenX - containerRect.left;
    const top = screenY - containerRect.top;

    this.inlineEditor.style.left = `${left}px`;
    this.inlineEditor.style.top = `${top}px`;
    this.inlineEditor.classList.remove('hidden');

    setTimeout(() => {
      this.inlineInput.focus();
      this.inlineInput.select();
    }, 50);
  }

  closeInlineEditor() {
    this.inlineEditor.classList.add('hidden');
    this.editingNodeId = null;
  }

  saveInlineGenotype() {
    if (!this.editingNodeId) return;
    const val = this.inlineInput.value.trim();
    const node = this.nodes.find(n => n.id === this.editingNodeId);
    if (node) {
      node.genotype = val;
      this.saveHistory();
      this.renderAll();
      this.updateInspector();
    }
    this.closeInlineEditor();
  }

  // --- Rendering Pipeline ---
  renderAll() {
    this.renderConnections();
    this.renderNodes();
    this.renderLegend();
    this.updateStats();
  }

  renderNodes() {
    this.nodesGroup.innerHTML = '';

    this.nodes.forEach(node => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', `pedigree-node ${this.selectedNodeId === node.id ? 'selected' : ''}`);
      g.setAttribute('transform', `translate(${node.x}, ${node.y})`);
      g.dataset.id = node.id;

      // Find phenotype fill definition
      const pheno = this.phenotypes.find(p => p.id === node.phenotypeId);
      let fillAttr = '#ffffff';
      if (pheno) {
        fillAttr = node.gender === 'female' ? (pheno.fillFemale || pheno.color) : (pheno.fillMale || pheno.color);
      }

      const isQuestion = (node.genotype === '?' || node.gender === 'question');
      if (node.gender === 'question' && !node.genotype) {
        node.genotype = '?';
      }

      // Determine effective question mark display style for this node
      let effectiveQuestionStyle = this.questionMarkStyle || 'overlay';
      if (node.questionStyle && node.questionStyle !== 'auto') {
        effectiveQuestionStyle = node.questionStyle;
      }

      const isStandaloneQuestion = isQuestion && (effectiveQuestionStyle === 'standalone');

      // Shape: Square for male, Circle for female/question, Transparent hit rect for standalone question
      let shapeEl;
      if (isStandaloneQuestion) {
        // Transparent hit box for click/drag only - NO circle, NO square, NO stroke!
        shapeEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        shapeEl.setAttribute('x', -this.nodeSize / 2);
        shapeEl.setAttribute('y', -this.nodeSize / 2);
        shapeEl.setAttribute('width', this.nodeSize);
        shapeEl.setAttribute('height', this.nodeSize);
        shapeEl.setAttribute('class', 'node-shape-question');
        shapeEl.setAttribute('fill', 'none');
        shapeEl.setAttribute('stroke', 'none');
        shapeEl.setAttribute('stroke-width', '0');
        shapeEl.style.pointerEvents = 'all';
      } else {
        if (node.gender === 'male') {
          shapeEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          shapeEl.setAttribute('x', -this.nodeSize / 2);
          shapeEl.setAttribute('y', -this.nodeSize / 2);
          shapeEl.setAttribute('width', this.nodeSize);
          shapeEl.setAttribute('height', this.nodeSize);
          shapeEl.setAttribute('rx', '4');
          shapeEl.setAttribute('ry', '4');
        } else {
          shapeEl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          shapeEl.setAttribute('cx', '0');
          shapeEl.setAttribute('cy', '0');
          shapeEl.setAttribute('r', this.nodeSize / 2);
        }

        shapeEl.setAttribute('class', `node-shape ${this.selectedNodeId === node.id ? 'selected' : ''}`);
        shapeEl.setAttribute('fill', fillAttr);
        shapeEl.setAttribute('stroke', '#1e293b');
        shapeEl.setAttribute('stroke-width', '2');
        if (this.selectedNodeId === node.id) {
          shapeEl.setAttribute('stroke', '#2563eb');
          shapeEl.setAttribute('stroke-width', '4');
        }
      }

      g.appendChild(shapeEl);

      // Center Genotype Text (double-click target)
      if (node.genotype) {
        const textGenotype = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textGenotype.setAttribute('class', 'node-genotype-text');
        textGenotype.setAttribute('x', '0');
        textGenotype.setAttribute('y', '0');

        if (isStandaloneQuestion) {
          textGenotype.setAttribute('font-size', '48px');
          textGenotype.setAttribute('font-weight', 'bold');
          textGenotype.setAttribute('fill', this.selectedNodeId === node.id ? '#2563eb' : '#1e293b');
        } else if (node.genotype === '?') {
          textGenotype.setAttribute('font-size', `${Math.max(22, Math.round(this.genotypeFontSize * 1.35))}px`);
          textGenotype.setAttribute('font-weight', 'bold');
          textGenotype.setAttribute('fill', '#1e293b');
        } else {
          textGenotype.setAttribute('font-size', `${this.genotypeFontSize}px`);
        }
        textGenotype.textContent = node.genotype;
        g.appendChild(textGenotype);
      }

      // Label Text below shape (e.g. (가), (나), (다)...)
      if (node.label) {
        const textLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textLabel.setAttribute('class', 'node-label-text');
        textLabel.setAttribute('x', '0');
        textLabel.setAttribute('y', (this.nodeSize / 2) + 20);
        textLabel.setAttribute('font-size', `${this.labelFontSize}px`);
        textLabel.textContent = node.label;
        g.appendChild(textLabel);
      }

      // Node Event Listeners
      g.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();

        if (this.activeMode === 'connect-spouse') {
          if (!this.connectSourceId) {
            this.connectSourceId = node.id;
            this.modeBannerText.textContent = `'${node.label}' 선택됨. 연결할 상대방 인물을 선택하세요.`;
          } else {
            this.connectSpouse(this.connectSourceId, node.id);
          }
          return;
        }

        if (this.activeMode === 'connect-child') {
          if (this.connectSourceId) {
            // Source is a spouse connection ID
            this.connectChild(this.connectSourceId, node.id);
          } else {
            this.setStatus('먼저 부부 연결선을 클릭하여 지정하세요.');
          }
          return;
        }

        // Selection & Drag initiation
        this.selectNode(node.id);
        this.draggingNodeId = node.id;
        const coords = this.screenToCanvasCoords(e.clientX, e.clientY);
        this.dragOffset = { x: coords.x - node.x, y: coords.y - node.y };
      });

      // Double-click to edit Genotype inline directly over shape center!
      g.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        this.openInlineEditor(node, e.clientX, e.clientY);
      });

      this.nodesGroup.appendChild(g);
    });
  }

  createInteractiveLine(d, connId) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    // 1. Invisible wide hit-zone path (16px wide for effortless clicking on parent/child lines)
    const hitZone = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitZone.setAttribute('d', d);
    hitZone.setAttribute('fill', 'none');
    hitZone.setAttribute('stroke', 'transparent');
    hitZone.setAttribute('stroke-width', '16');
    hitZone.style.cursor = 'pointer';

    // 2. Visible line path
    const visiblePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    visiblePath.setAttribute('d', d);
    visiblePath.setAttribute('fill', 'none');
    visiblePath.setAttribute('class', `pedigree-line ${this.selectedConnectionId === connId ? 'selected' : ''}`);

    hitZone.addEventListener('mouseover', () => visiblePath.classList.add('hovered'));
    hitZone.addEventListener('mouseout', () => visiblePath.classList.remove('hovered'));

    hitZone.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.activeMode === 'connect-child') {
        const conn = this.connections.find(c => c.id === connId);
        if (conn && conn.type === 'spouse') {
          this.connectSourceId = connId;
          this.modeBannerText.textContent = '부부선 선택됨! 연결할 자녀 도형을 클릭하세요.';
        } else {
          this.selectConnection(connId);
        }
      } else {
        this.selectConnection(connId);
      }
    });

    g.appendChild(visiblePath);
    g.appendChild(hitZone);
    return g;
  }

  renderConnections() {
    this.connectionsGroup.innerHTML = '';

    // 1. Render Spouse Connections
    this.connections.forEach(conn => {
      if (conn.type === 'spouse') {
        const n1 = this.nodes.find(n => n.id === conn.spouse1Id);
        const n2 = this.nodes.find(n => n.id === conn.spouse2Id);

        if (!n1 || !n2) return;

        // Line connecting horizontal edges of the two shapes
        const d = `M ${n1.x} ${n1.y} L ${n2.x} ${n2.y}`;
        const lineGroup = this.createInteractiveLine(d, conn.id);
        this.connectionsGroup.appendChild(lineGroup);

        // Store computed midpoint on connection object for child lines
        const midX = (n1.x + n2.x) / 2;
        const midY = (n1.y + n2.y) / 2;
        conn.computedMid = { x: midX, y: midY };
      }
    });

    // 2. Render Parent-Child Connections (Consolidate multiple children of the same spouse connection)
    const childMap = new Map();
    this.connections.forEach(conn => {
      if (conn.type === 'child') {
        if (!childMap.has(conn.spouseConnId)) {
          childMap.set(conn.spouseConnId, { id: conn.id, spouseConnId: conn.spouseConnId, childrenIds: [] });
        }
        const entry = childMap.get(conn.spouseConnId);
        conn.childrenIds.forEach(cid => {
          if (!entry.childrenIds.includes(cid)) {
            entry.childrenIds.push(cid);
          }
        });
      }
    });

    childMap.forEach(conn => {
      const spouseConn = this.connections.find(c => c.id === conn.spouseConnId);
      if (!spouseConn) return;

      const children = conn.childrenIds.map(id => this.nodes.find(n => n.id === id)).filter(Boolean);
      if (children.length === 0) return;

      const p1 = this.nodes.find(n => n.id === spouseConn.spouse1Id);
      const p2 = this.nodes.find(n => n.id === spouseConn.spouse2Id);
      if (!p1 || !p2) return;

      const marriageY = Math.round((p1.y + p2.y) / 2);
      const minParentX = Math.min(p1.x, p2.x);
      const maxParentX = Math.max(p1.x, p2.x);

      if (children.length === 1) {
        // Single child case: Direct straight vertical line if child is within parent X range!
        const child = children[0];
        const childTopY = child.y - (this.nodeSize / 2);

        let d = '';
        if (child.x >= minParentX && child.x <= maxParentX) {
          // Straight vertical line from marriage line directly to child top!
          d = `M ${child.x} ${marriageY} L ${child.x} ${childTopY}`;
        } else {
          // Child is outside parent range: orthogonal step
          const startX = child.x < minParentX ? minParentX : maxParentX;
          const branchY = Math.round((marriageY + child.y) / 2);
          d = `M ${startX} ${marriageY} L ${startX} ${branchY} L ${child.x} ${branchY} L ${child.x} ${childTopY}`;
        }

        const lineGroup = this.createInteractiveLine(d, conn.id);
        this.connectionsGroup.appendChild(lineGroup);
      } else {
        // Multiple children case: Sibling horizontal branch bar
        const minChildY = Math.min(...children.map(c => c.y));
        const branchY = Math.round((marriageY + minChildY) / 2);

        // Calculate stem X position (clamped to parent marriage line)
        const childrenMidX = Math.round(children.reduce((acc, c) => acc + c.x, 0) / children.length);
        const stemX = Math.max(minParentX, Math.min(maxParentX, childrenMidX));

        // Path 1: Stem line down from parent marriage bar to branch Y
        const stemD = `M ${stemX} ${marriageY} L ${stemX} ${branchY}`;
        const stemGroup = this.createInteractiveLine(stemD, conn.id);
        this.connectionsGroup.appendChild(stemGroup);

        // Path 2: Horizontal branch bar across all children X range
        const minX = Math.min(...children.map(c => c.x));
        const maxX = Math.max(...children.map(c => c.x));

        const branchD = `M ${minX} ${branchY} L ${maxX} ${branchY}`;
        const branchGroup = this.createInteractiveLine(branchD, conn.id);
        this.connectionsGroup.appendChild(branchGroup);

        // Path 3: Drop line to each child
        children.forEach(child => {
          const dropD = `M ${child.x} ${branchY} L ${child.x} ${child.y - (this.nodeSize / 2)}`;
          const dropGroup = this.createInteractiveLine(dropD, conn.id);
          this.connectionsGroup.appendChild(dropGroup);
        });
      }
    });
  }

  renderLegend() {
    this.legendGroup.innerHTML = '';
    if (!this.toggleLegend.checked) return;

    // Calculate maximum bounds of nodes to place legend neatly on the bottom right
    let defaultX = 600;
    let defaultY = 350;
    if (this.nodes.length > 0) {
      defaultX = Math.max(...this.nodes.map(n => n.x)) + 120;
      defaultY = Math.max(...this.nodes.map(n => n.y)) - 100;
    }

    const legendX = this.legendPos ? this.legendPos.x : defaultX;
    const legendY = this.legendPos ? this.legendPos.y : defaultY;
    this.currentLegendPos = { x: legendX, y: legendY };

    const grayColor = this.getGrayColorHex(this.grayDarkness);

    const allLegendItems = [
      { origIndex: 0, label: this.legendTexts[0] || '', gender: 'female', fill: '#ffffff' },
      { origIndex: 1, label: this.legendTexts[1] || '', gender: 'male', fill: '#ffffff' },
      { origIndex: 2, label: this.legendTexts[2] || '', gender: 'female', fill: grayColor },
      { origIndex: 3, label: this.legendTexts[3] || '', gender: 'male', fill: grayColor }
    ];

    const isVisible = (origIndex) => !this.legendVisibleItems || this.legendVisibleItems[origIndex] !== false;

    let legendWidth;
    let legendHeight;
    let renderList = []; // list of { item, itemX, itemY }

    if (this.legendLayout === '2col') {
      const leftItems = allLegendItems.filter(item => item.origIndex < 2 && isVisible(item.origIndex));
      const rightItems = allLegendItems.filter(item => item.origIndex >= 2 && isVisible(item.origIndex));

      if (leftItems.length === 0 && rightItems.length === 0) return;

      const numRows = Math.max(1, leftItems.length, rightItems.length);

      let maxLeftTextWidth = 70;
      leftItems.forEach(item => {
        const w = this.getTextWidth(item.label);
        if (w > maxLeftTextWidth) maxLeftTextWidth = w;
      });

      let maxRightTextWidth = 70;
      rightItems.forEach(item => {
        const w = this.getTextWidth(item.label);
        if (w > maxRightTextWidth) maxRightTextWidth = w;
      });

      let col1Width = Math.max(120, Math.ceil(48 + maxLeftTextWidth + 20));
      const col2Width = rightItems.length > 0 ? Math.max(120, Math.ceil(48 + maxRightTextWidth + 20)) : 0;

      if (rightItems.length === 0) {
        legendWidth = this.legendAutoWidth ? col1Width : Math.max(col1Width, this.legendWidth || 180);
      } else if (leftItems.length === 0) {
        col1Width = 0;
        legendWidth = this.legendAutoWidth ? col2Width : Math.max(col2Width, this.legendWidth || 180);
      } else {
        if (this.legendAutoWidth) {
          legendWidth = col1Width + col2Width;
        } else {
          const manualW = this.legendWidth || 340;
          legendWidth = Math.max(col1Width + col2Width, manualW);
          col1Width = Math.max(col1Width, Math.floor(legendWidth / 2));
        }
      }
      legendHeight = (numRows * 32) + 16;

      leftItems.forEach((item, r) => {
        renderList.push({ item, itemX: legendX, itemY: legendY + 24 + (r * 32) });
      });

      const rightStartX = leftItems.length > 0 ? legendX + col1Width : legendX;
      rightItems.forEach((item, r) => {
        renderList.push({ item, itemX: rightStartX, itemY: legendY + 24 + (r * 32) });
      });
    } else {
      // 1col mode
      const activeItems = allLegendItems.filter(item => isVisible(item.origIndex));
      if (activeItems.length === 0) return;

      let maxTextPixelWidth = 70;
      activeItems.forEach(item => {
        const w = this.getTextWidth(item.label);
        if (w > maxTextPixelWidth) maxTextPixelWidth = w;
      });

      if (this.legendAutoWidth) {
        legendWidth = Math.max(130, Math.ceil(48 + maxTextPixelWidth + 20));
      } else {
        legendWidth = this.legendWidth || 180;
      }
      legendHeight = (activeItems.length * 32) + 16;

      activeItems.forEach((item, r) => {
        renderList.push({ item, itemX: legendX, itemY: legendY + 24 + (r * 32) });
      });
    }

    // Background card for legend
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', legendX);
    bgRect.setAttribute('y', legendY);
    bgRect.setAttribute('width', legendWidth);
    bgRect.setAttribute('height', legendHeight);
    bgRect.setAttribute('class', 'legend-box-rect');
    this.legendGroup.appendChild(bgRect);

    renderList.forEach(({ item, itemX, itemY }) => {
      // Icon shape
      if (item.gender === 'male') {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', itemX + 16);
        rect.setAttribute('y', itemY - 10);
        rect.setAttribute('width', '20');
        rect.setAttribute('height', '20');
        rect.setAttribute('rx', '2');
        rect.setAttribute('ry', '2');
        rect.setAttribute('fill', item.fill);
        rect.setAttribute('stroke', '#1e293b');
        rect.setAttribute('stroke-width', '1.5');
        this.legendGroup.appendChild(rect);
      } else {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', itemX + 26);
        circle.setAttribute('cy', itemY);
        circle.setAttribute('r', '10');
        circle.setAttribute('fill', item.fill);
        circle.setAttribute('stroke', '#1e293b');
        circle.setAttribute('stroke-width', '1.5');
        this.legendGroup.appendChild(circle);
      }

      // Legend Label Text
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', itemX + 48);
      text.setAttribute('y', itemY + 4);
      text.setAttribute('class', 'legend-text');
      text.textContent = item.label;
      this.legendGroup.appendChild(text);
    });
  }

  // --- Inspector & Sidebar Management ---
  updateInspector() {
    if (this.selectedNodeId) {
      const node = this.nodes.find(n => n.id === this.selectedNodeId);
      if (node) {
        this.noSelectionMsg.classList.add('hidden');
        this.connectionInspector.classList.add('hidden');
        this.nodeInspector.classList.remove('hidden');

        this.inputNodeLabel.value = node.label || '';
        this.inputNodeGenotype.value = node.genotype || '';

        this.radioGenders.forEach(radio => {
          radio.checked = radio.value === node.gender;
        });

        this.populatePhenotypeDropdown();
        this.selectNodePhenotype.value = node.phenotypeId || 'trait-white';
        if (this.selectNodeQuestionStyle) {
          this.selectNodeQuestionStyle.value = node.questionStyle || 'auto';
        }
      }
    } else if (this.selectedConnectionId) {
      this.noSelectionMsg.classList.add('hidden');
      this.nodeInspector.classList.add('hidden');
      this.connectionInspector.classList.remove('hidden');
      const conn = this.connections.find(c => c.id === this.selectedConnectionId);
      this.connectionInfoText.textContent = conn && conn.type === 'spouse' ? '부부 연결선' : '자녀 연결선';
    } else {
      this.noSelectionMsg.classList.remove('hidden');
      this.nodeInspector.classList.add('hidden');
      this.connectionInspector.classList.add('hidden');
    }
  }

  populatePhenotypeDropdown() {
    this.selectNodePhenotype.innerHTML = '';
    this.phenotypes.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      this.selectNodePhenotype.appendChild(opt);
    });
  }

  renderPhenotypeInspectorList() {
    this.phenotypeListEl.innerHTML = '';
    this.phenotypes.forEach(p => {
      const item = document.createElement('div');
      item.className = 'phenotype-item';

      const swatch = document.createElement('div');
      swatch.className = 'phenotype-color-swatch';
      swatch.style.backgroundColor = p.color;

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'phenotype-name-input';
      input.value = p.name;
      input.addEventListener('change', (e) => {
        p.name = e.target.value;
        this.saveHistory();
        this.renderAll();
        this.populatePhenotypeDropdown();
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'btn-remove-pheno';
      delBtn.innerHTML = '&times;';
      delBtn.addEventListener('click', () => {
        if (this.phenotypes.length <= 1) return;
        this.phenotypes = this.phenotypes.filter(ph => ph.id !== p.id);
        this.saveHistory();
        this.renderPhenotypeInspectorList();
        this.renderAll();
      });

      item.appendChild(swatch);
      item.appendChild(input);
      item.appendChild(delBtn);
      this.phenotypeListEl.appendChild(item);
    });
  }

  addNewPhenotype() {
    const colors = ['#cbd5e1', '#475569', '#0f172a', '#94a3b8', '#64748b'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newPheno = {
      id: 'trait-' + Date.now(),
      name: '새 형질 ' + (this.phenotypes.length + 1),
      color: randomColor,
      fillMale: randomColor,
      fillFemale: randomColor
    };
    this.phenotypes.push(newPheno);
    this.saveHistory();
    this.renderPhenotypeInspectorList();
    this.populatePhenotypeDropdown();
    this.setStatus('새 표현형이 추가되었습니다.');
  }

  updateStats() {
    this.statNodeCount.textContent = this.nodes.length;
    this.statConnCount.textContent = this.connections.length;
  }

  // --- Sample Template Preloader (Matching the user's attached photo!) ---
  loadSampleTemplate() {
    this.nodes = [];
    this.connections = [];
    this.legendPos = null;

    // Reset Zoom/Pan
    this.scale = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.applyTransform();

    // Generation I (Top row)
    const n1 = this.addNode('male', 120, 100, '(가)', '', 'trait-white');   // Male White (가)
    const n2 = this.addNode('female', 320, 100, '(나)', '', 'trait-white'); // Female White (나)
    const n3 = this.addNode('female', 540, 100, '(다)', '', 'trait-white'); // Female White (다)
    const n4 = this.addNode('male', 740, 100, '(라)', '', 'trait-gray');   // Male Gray (라)

    // Spouse connections I
    const connSpouse1 = 'conn-spouse-1-2';
    const connSpouse2 = 'conn-spouse-3-4';

    this.connections.push({ id: connSpouse1, type: 'spouse', spouse1Id: n1.id, spouse2Id: n2.id });
    this.connections.push({ id: connSpouse2, type: 'spouse', spouse1Id: n3.id, spouse2Id: n4.id });

    // Generation II (Middle row)
    const n5 = this.addNode('female', 220, 300, '(마)', '', 'trait-white');   // Female White (마)
    const n6 = this.addNode('male', 640, 300, '(바)', '', 'trait-gray');    // Male Gray (바)

    // Child connections to Gen II
    this.connections.push({
      id: 'conn-child-12',
      type: 'child',
      spouseConnId: connSpouse1,
      childrenIds: [n5.id]
    });

    this.connections.push({
      id: 'conn-child-34',
      type: 'child',
      spouseConnId: connSpouse2,
      childrenIds: [n6.id]
    });

    // Spouse connection Gen II (마 and 바)
    const connSpouse3 = 'conn-spouse-5-6';
    this.connections.push({ id: connSpouse3, type: 'spouse', spouse1Id: n5.id, spouse2Id: n6.id });

    // Generation III (Bottom row - 2 siblings under (마) and (바))
    const n7 = this.addNode('female', 370, 500, '(사)', '', 'trait-white'); // Female White (사)
    const n8 = this.addNode('male', 490, 500, '(아)', '', 'trait-white');   // Male Square (아)

    // Child connection to Gen III (Siblings branch bar)
    this.connections.push({
      id: 'conn-child-56',
      type: 'child',
      spouseConnId: connSpouse3,
      childrenIds: [n7.id, n8.id]
    });

    this.deselectAll();
    this.undoStack = [];
    this.redoStack = [];
    this.saveHistory();
    this.renderAll();
    this.setStatus('첨부 예시 가계도 템플릿이 로드되었습니다.');
  }

  clearCanvas() {
    this.nodes = [];
    this.connections = [];
    this.legendPos = null;
    this.deselectAll();
    this.saveHistory();
    this.renderAll();
    this.setStatus('새 가계도 캔버스가 준비되었습니다.');
  }

  // --- Import / Export ---
  saveJSON() {
    const data = {
      nodes: this.nodes,
      connections: this.connections,
      phenotypes: this.phenotypes,
      legendPos: this.legendPos,
      legendTexts: this.legendTexts,
      legendLayout: this.legendLayout,
      legendVisibleItems: this.legendVisibleItems,
      legendAutoWidth: this.legendAutoWidth,
      legendWidth: this.legendWidth,
      questionMarkStyle: this.questionMarkStyle
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `pedigree_project_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.setStatus('프로젝트 파일(.json)로 저장되었습니다.');
  }

  loadJSON(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.nodes && parsed.connections) {
          this.nodes = parsed.nodes;
          this.connections = parsed.connections;
          if (parsed.phenotypes) this.phenotypes = parsed.phenotypes;
          if (parsed.legendPos !== undefined) this.legendPos = parsed.legendPos;
          if (parsed.legendTexts !== undefined) this.legendTexts = parsed.legendTexts;
          if (parsed.legendLayout !== undefined) this.legendLayout = parsed.legendLayout;
          if (parsed.legendVisibleItems !== undefined) this.legendVisibleItems = parsed.legendVisibleItems;
          if (parsed.legendAutoWidth !== undefined) this.legendAutoWidth = parsed.legendAutoWidth;
          if (parsed.legendWidth !== undefined) this.legendWidth = parsed.legendWidth;
          if (parsed.questionMarkStyle !== undefined) this.questionMarkStyle = parsed.questionMarkStyle;
          this.syncLegendInputs();
          this.deselectAll();
          this.saveHistory();
          this.renderAll();
          this.setStatus('프로젝트를 성공적으로 불러왔습니다.');
        }
      } catch (err) {
        alert('올바른 가계도 프로젝트 JSON 파일이 아닙니다.');
      }
    };
    reader.readAsText(file);
  }
}

// Initialize application on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new GeneticsPedigreeApp();
});
