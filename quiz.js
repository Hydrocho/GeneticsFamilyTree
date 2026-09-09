/**
 * Genetics Quiz Engine (유전 가계도 퀴즈 엔진)
 * - 쌍꺼풀 유전 (상염색체 우성/열성)
 * - ABO 혈액형 유전 (복대립 유전)
 * - 적록 색맹 유전 (반성 열성 유전)
 * 9명 이내의 가계도를 과학적 오류 없이 무작위로 생성하고 유전자형 추론 퀴즈를 제공합니다.
 */

class GeneticsQuizEngine {
  constructor() {
    this.currentQuiz = null;
    this.userAnswers = {};
    this.initUIElements();
    this.bindEvents();
    this.generateNewQuiz();
  }

  initUIElements() {
    this.btnQuizStart = document.getElementById('btn-quiz-start');
    this.quizPanel = document.getElementById('quiz-panel');
    this.quizCloseBtn = document.getElementById('quiz-panel-close');
    this.btnQuizGenerate = document.getElementById('btn-quiz-generate');
    this.btnQuizSubmit = document.getElementById('btn-quiz-submit');
    this.btnQuizHint = document.getElementById('btn-quiz-hint');
    this.quizTraitTabs = document.querySelectorAll('.quiz-trait-tab');
    this.quizTargetSelect = document.getElementById('quiz-target-mode');
    this.quizInputContainer = document.getElementById('quiz-input-container');
    this.quizResultBanner = document.getElementById('quiz-result-banner');
    this.quizExplanationBox = document.getElementById('quiz-explanation-box');
    this.quizInfoTitle = document.getElementById('quiz-info-title');
    this.quizInfoDesc = document.getElementById('quiz-info-desc');

    this.personChipsContainer = document.getElementById('quiz-person-chips');
    this.selectedCardContainer = document.getElementById('quiz-selected-card');
    this.toggleAllBtn = document.getElementById('toggle-all-inputs-btn');

    this.selectedTrait = 'double_eyelid'; // 'double_eyelid', 'blood_type', 'color_blindness'
    this.targetMode = 'all'; // 'all' (모든 인물) or 'question_only' (? 표기 인물)
    this.selectedPersonId = null;
    this.individualResults = {};

    this.legendPos = { x: 500, y: 320 };
    this.isDraggingLegend = false;
    this.dragStartPos = { x: 0, y: 0 };
    this.dragStartLegendPos = { x: 500, y: 320 };

    // Viewport transform (Pan & Zoom for Quiz Canvas)
    this.scale = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isPanningCanvas = false;
    this.startPanPos = { x: 0, y: 0 };
  }

  isEditorApp() {
    return window.app && Array.isArray(window.app.nodes) && typeof window.app.renderAll === 'function';
  }

  applyTransform() {
    const viewportGroup = document.getElementById('viewport-group');
    if (viewportGroup) {
      viewportGroup.setAttribute('transform', `translate(${this.panX}, ${this.panY}) scale(${this.scale})`);
    }
  }

  zoom(factor) {
    const newScale = Math.min(Math.max(this.scale * factor, 0.4), 2.5);
    const svgCanvas = document.getElementById('quiz-canvas');
    if (svgCanvas) {
      const rect = svgCanvas.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      this.panX = cx - (cx - this.panX) * (newScale / this.scale);
      this.panY = cy - (cy - this.panY) * (newScale / this.scale);
      this.scale = newScale;
      this.applyTransform();
      this.updateZoomBadge();
    }
  }

  resetZoom() {
    this.scale = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.applyTransform();
    this.updateZoomBadge();
  }

  updateZoomBadge() {
    const badge = document.getElementById('val-quiz-zoom');
    if (badge) {
      badge.textContent = `${Math.round(this.scale * 100)}%`;
    }
  }

  bindEvents() {
    if (this.btnQuizStart) {
      this.btnQuizStart.addEventListener('click', () => this.toggleQuizPanel());
    }
    if (this.quizCloseBtn) {
      this.quizCloseBtn.addEventListener('click', () => this.closeQuizPanel());
    }

    this.quizTraitTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const trait = tab.getAttribute('data-trait');
        this.quizTraitTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.selectedTrait = trait;
        this.generateNewQuiz();
      });
    });

    if (this.quizTargetSelect) {
      this.quizTargetSelect.addEventListener('change', (e) => {
        this.targetMode = e.target.value;
        this.renderInputForm();
      });
    }

    if (this.btnQuizGenerate) {
      this.btnQuizGenerate.addEventListener('click', () => this.generateNewQuiz());
    }

    if (this.btnQuizSubmit) {
      this.btnQuizSubmit.addEventListener('click', () => this.checkAnswers());
    }

    if (this.btnQuizHint) {
      this.btnQuizHint.addEventListener('click', () => this.toggleExplanations());
    }

    if (this.toggleAllBtn && this.quizInputContainer) {
      this.toggleAllBtn.addEventListener('click', () => {
        this.quizInputContainer.classList.toggle('hidden');
        const icon = this.toggleAllBtn.querySelector('.toggle-icon');
        if (icon) {
          icon.classList.toggle('fa-chevron-down');
          icon.classList.toggle('fa-chevron-up');
        }
      });
    }

    // Zoom Buttons
    const btnZoomIn = document.getElementById('btn-quiz-zoom-in');
    const btnZoomOut = document.getElementById('btn-quiz-zoom-out');
    const btnZoomReset = document.getElementById('btn-quiz-zoom-reset');

    if (btnZoomIn) btnZoomIn.addEventListener('click', () => this.zoom(1.15));
    if (btnZoomOut) btnZoomOut.addEventListener('click', () => this.zoom(0.85));
    if (btnZoomReset) btnZoomReset.addEventListener('click', () => this.resetZoom());

    // Modal buttons
    const btnModalRetry = document.getElementById('btn-modal-retry');
    const btnModalClose = document.getElementById('btn-modal-close');
    const btnModalXClose = document.getElementById('btn-modal-x-close');
    const completionModal = document.getElementById('quiz-completion-modal');

    if (btnModalRetry) {
      btnModalRetry.addEventListener('click', () => {
        if (completionModal) completionModal.classList.add('hidden');
        this.generateNewQuiz();
      });
    }

    if (btnModalClose) {
      btnModalClose.addEventListener('click', () => {
        if (completionModal) completionModal.classList.add('hidden');
      });
    }

    if (btnModalXClose) {
      btnModalXClose.addEventListener('click', () => {
        if (completionModal) completionModal.classList.add('hidden');
      });
    }

    // Legend Modal buttons
    const btnLegendTrigger = document.getElementById('btn-quiz-legend-trigger');
    const btnLegendX = document.getElementById('btn-legend-modal-x');
    const btnLegendClose = document.getElementById('btn-legend-modal-close');
    const legendModal = document.getElementById('quiz-legend-modal');

    if (btnLegendTrigger) {
      btnLegendTrigger.addEventListener('click', () => this.openLegendModal());
    }
    if (btnLegendX) {
      btnLegendX.addEventListener('click', () => {
        if (legendModal) legendModal.classList.add('hidden');
      });
    }
    if (btnLegendClose) {
      btnLegendClose.addEventListener('click', () => {
        if (legendModal) legendModal.classList.add('hidden');
      });
    }

    // Secret Key Combination (Ctrl+E or Cmd+E) - Transports Quiz Pedigree to Editor (index.html)
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        if (!this.currentQuiz) return;

        const nodesCopy = JSON.parse(JSON.stringify(this.currentQuiz.nodes));

        if (this.currentQuiz.traitType === 'blood_type') {
          nodesCopy.forEach(node => {
            const bloodType = node._bloodType || '';
            if (bloodType) {
              node.genotype = bloodType;
            }
          });
        } else {
          nodesCopy.forEach(node => {
            if (node.genotype === '?' || !node.genotype) {
              const validAnswer = this.currentQuiz.validAnswers ? this.currentQuiz.validAnswers[node.id] : null;
              if (validAnswer) {
                const answerStr = Array.isArray(validAnswer) ? validAnswer.join(', ') : String(validAnswer);
                node.genotype = answerStr;
              }
            }
          });
        }

        const secretPedigreeData = {
          nodes: nodesCopy,
          connections: this.currentQuiz.connections,
          legendTexts: this.currentQuiz.legendTexts,
          questionMarkStyle: this.currentQuiz.questionMarkStyle || 'overlay',
          traitType: this.currentQuiz.traitType,
          timestamp: Date.now()
        };

        try {
          localStorage.setItem('secret_edit_pedigree', JSON.stringify(secretPedigreeData));
          window.location.href = 'index.html?secret_edit=1';
        } catch (err) {
          console.error('Failed to export secret quiz pedigree:', err);
        }
      }
    });

    // Mouse Wheel Zoom & Mouse Drag Handlers (Desktop)
    const svgCanvas = document.getElementById('quiz-canvas');
    if (svgCanvas) {
      // 1. Mouse wheel zoom
      svgCanvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
        const rect = svgCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const newScale = Math.min(Math.max(this.scale * zoomFactor, 0.4), 2.5);
        this.panX = mouseX - (mouseX - this.panX) * (newScale / this.scale);
        this.panY = mouseY - (mouseY - this.panY) * (newScale / this.scale);
        this.scale = newScale;
        this.applyTransform();
        this.updateZoomBadge();
      }, { passive: false });

      // 2. Desktop Mouse Dragging
      const startDrag = (clientX, clientY, target, e) => {
        if (target === svgCanvas || target.id === 'viewport-group' || target.tagName === 'svg') {
          this.isPanningCanvas = true;
          this.startPanPos = { x: clientX - this.panX, y: clientY - this.panY };
        }
      };

      const moveDrag = (clientX, clientY) => {
        if (this.isPanningCanvas) {
          this.panX = clientX - this.startPanPos.x;
          this.panY = clientY - this.startPanPos.y;
          this.applyTransform();
        }
      };

      const endDrag = () => {
        this.isPanningCanvas = false;
      };

      svgCanvas.addEventListener('mousedown', (e) => startDrag(e.clientX, e.clientY, e.target, e));
      window.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
      window.addEventListener('mouseup', endDrag);

      // 3. Mobile Touch Drag Panning (캔버스 드래그 이동)
      let isTouchDragging = false;
      let touchStartPos = { x: 0, y: 0 };
      let touchStartPan = { x: 0, y: 0 };

      svgCanvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          isTouchDragging = true;
          const touch = e.touches[0];
          touchStartPos = { x: touch.clientX, y: touch.clientY };
          touchStartPan = { x: this.panX, y: this.panY };
        }
      }, { passive: true });

      svgCanvas.addEventListener('touchmove', (e) => {
        if (isTouchDragging && e.touches.length === 1) {
          const touch = e.touches[0];
          const dx = touch.clientX - touchStartPos.x;
          const dy = touch.clientY - touchStartPos.y;

          if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            if (e.cancelable) e.preventDefault();
            this.panX = touchStartPan.x + dx;
            this.panY = touchStartPan.y + dy;
            this.applyTransform();
          }
        }
      }, { passive: false });

      svgCanvas.addEventListener('touchend', () => {
        isTouchDragging = false;
      }, { passive: true });
    }

    window.addEventListener('resize', () => {
      this.autoFitMobileCanvas();
    });
  }

  toggleQuizPanel() {
    if (!this.quizPanel) return;
    const isHidden = this.quizPanel.classList.contains('hidden');
    if (isHidden) {
      this.openQuizPanel();
    } else {
      this.closeQuizPanel();
    }
  }

  openQuizPanel() {
    if (!this.quizPanel) return;
    this.quizPanel.classList.remove('hidden');
    if (this.btnQuizStart) {
      this.btnQuizStart.classList.add('active');
    }
    if (!this.currentQuiz) {
      this.generateNewQuiz();
    }
  }

  closeQuizPanel() {
    if (!this.quizPanel) return;
    this.quizPanel.classList.add('hidden');
    if (this.btnQuizStart) {
      this.btnQuizStart.classList.remove('active');
    }
  }

  highlightNodeInput(id) {
    if (!id || !this.currentQuiz) return;
    this.selectedPersonId = id;
    this.renderPersonChips();
    this.renderSelectedPersonCard();

    // Also focus in main grid if open
    const itemEl = document.getElementById(`quiz-item-${id}`);
    const inputEl = document.getElementById(`quiz-input-${id}`);
    if (itemEl && inputEl && !this.quizInputContainer?.classList.contains('hidden')) {
      document.querySelectorAll('.quiz-input-item').forEach(el => el.classList.remove('focused-node'));
      itemEl.classList.add('focused-node');
      itemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /**
   * 새로운 가계도 퀴즈 생성
   */
  generateNewQuiz() {
    this.userAnswers = {};
    this.individualResults = {};
    const completionModal = document.getElementById('quiz-completion-modal');
    if (completionModal) completionModal.classList.add('hidden');

    if (this.quizResultBanner) {
      this.quizResultBanner.className = 'quiz-result-banner hidden';
    }
    if (this.quizExplanationBox) {
      this.quizExplanationBox.classList.add('hidden');
    }

    // 1. 선택된 유전 형질에 따라 가계도 생성
    let quizData = null;
    switch (this.selectedTrait) {
      case 'double_eyelid':
        quizData = this.generateDoubleEyelidQuiz();
        break;
      case 'blood_type':
        quizData = this.generateBloodTypeQuiz();
        break;
      case 'color_blindness':
        quizData = this.generateColorBlindnessQuiz();
        break;
      default:
        quizData = this.generateDoubleEyelidQuiz();
    }

    this.currentQuiz = quizData;
    if (quizData.nodes && quizData.nodes.length > 0) {
      this.selectedPersonId = quizData.nodes[0].id;
    }

    // 2. 가계도를 캔버스(window.app)에 로드 및 렌더링
    this.loadQuizToCanvas(quizData);
    this.autoFitMobileCanvas();

    // 3. 문제 설명 업데이트
    this.updateQuizInfoText();

    // 4. 인물 칩 및 선택된 인물 카드 렌더링
    this.updateScoreBadge();
    this.renderPersonChips();
    this.renderSelectedPersonCard();
    this.renderInputForm();
  }

  autoFitMobileCanvas() {
    if (window.innerWidth <= 768) {
      const svg = document.getElementById('quiz-canvas');
      if (svg) {
        const rect = svg.getBoundingClientRect();
        const canvasWidth = rect.width || window.innerWidth;
        const scale = Math.min(canvasWidth / 520, 0.85);
        this.scale = scale;
        this.panX = (canvasWidth - 620 * scale) / 2 + 50 * scale;
        this.panY = -15 * scale;
        this.applyTransform();
        this.updateZoomBadge();
      }
    }
  }

  updateScoreBadge() {
    if (!this.currentQuiz) return;
    const { nodes } = this.currentQuiz;
    const totalCount = nodes.length;
    let correctCount = 0;

    nodes.forEach(node => {
      const res = this.individualResults[node.id];
      if (res && res.isCorrect) {
        correctCount++;
      }
    });

    const scoreEl = document.getElementById('val-quiz-score');
    const totalEl = document.getElementById('val-quiz-total');
    if (scoreEl) scoreEl.textContent = correctCount;
    if (totalEl) totalEl.textContent = totalCount;
  }

  /**
   * 퀴즈 정보를 캔버스에 렌더링
   */
  loadQuizToCanvas(quizData) {
    if (this.isEditorApp()) {
      const app = window.app;
      app.nodes = quizData.nodes;
      app.connections = quizData.connections;
      app.legendTexts = quizData.legendTexts;
      app.legendVisibleItems = [true, true, true, true];

      if (quizData.questionMarkStyle) {
        app.questionMarkStyle = quizData.questionMarkStyle;
      }

      if (typeof app.syncLegendInputs === 'function') {
        app.syncLegendInputs();
      }

      app.deselectAll();
      app.saveHistory();
      app.renderAll();
      app.setStatus(`[퀴즈 생성] ${quizData.title} 가계도가 캔버스에 적용되었습니다.`);
    }

    this.renderStandaloneCanvas(quizData);
  }

  renderStandaloneCanvas(quizData) {
    const svg = document.getElementById('quiz-canvas');
    if (!svg || !quizData) return;

    const connGroup = document.getElementById('connections-group');
    const nodesGroup = document.getElementById('nodes-group');
    const legendGroup = document.getElementById('legend-group');

    if (!connGroup || !nodesGroup || !legendGroup) return;

    connGroup.innerHTML = '';
    nodesGroup.innerHTML = '';
    legendGroup.innerHTML = '';

    const nodes = quizData.nodes;
    const connections = quizData.connections;

    const nodeMap = {};
    nodes.forEach(n => nodeMap[n.id] = n);

    // 1. Draw Connection Lines
    connections.forEach(conn => {
      if (conn.type === 'spouse') {
        const n1 = nodeMap[conn.spouse1Id];
        const n2 = nodeMap[conn.spouse2Id];
        if (n1 && n2) {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', n1.x);
          line.setAttribute('y1', n1.y);
          line.setAttribute('x2', n2.x);
          line.setAttribute('y2', n2.y);
          line.setAttribute('stroke', '#1e293b');
          line.setAttribute('stroke-width', '2.5');
          connGroup.appendChild(line);
        }
      } else if (conn.type === 'child') {
        const spouseConn = connections.find(c => c.id === conn.spouseConnId);
        if (spouseConn) {
          const p1 = nodeMap[spouseConn.spouse1Id];
          const p2 = nodeMap[spouseConn.spouse2Id];
          if (p1 && p2) {
            const centerX = (p1.x + p2.x) / 2;
            const parentY = p1.y;
            const branchY = parentY + 50;

            // Vertical drop from spouse line
            const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line1.setAttribute('x1', centerX);
            line1.setAttribute('y1', parentY);
            line1.setAttribute('x2', centerX);
            line1.setAttribute('y2', branchY);
            line1.setAttribute('stroke', '#1e293b');
            line1.setAttribute('stroke-width', '2.5');
            connGroup.appendChild(line1);

            const children = conn.childrenIds.map(id => nodeMap[id]).filter(Boolean);
            if (children.length > 0) {
              const minX = Math.min(...children.map(c => c.x));
              const maxX = Math.max(...children.map(c => c.x));

              // Horizontal branch bar
              const lineBar = document.createElementNS('http://www.w3.org/2000/svg', 'line');
              lineBar.setAttribute('x1', minX);
              lineBar.setAttribute('y1', branchY);
              lineBar.setAttribute('x2', maxX);
              lineBar.setAttribute('y2', branchY);
              lineBar.setAttribute('stroke', '#1e293b');
              lineBar.setAttribute('stroke-width', '2.5');
              connGroup.appendChild(lineBar);

              // Vertical drops to each child
              children.forEach(ch => {
                const lineDrop = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                lineDrop.setAttribute('x1', ch.x);
                lineDrop.setAttribute('y1', branchY);
                lineDrop.setAttribute('x2', ch.x);
                lineDrop.setAttribute('y2', ch.y);
                lineDrop.setAttribute('stroke', '#1e293b');
                lineDrop.setAttribute('stroke-width', '2.5');
                connGroup.appendChild(lineDrop);
              });
            }
          }
        }
      }
    });

    // 2. Draw Nodes
    nodes.forEach(n => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', `quiz-node-g ${n.id === this.selectedPersonId ? 'selected' : ''}`);
      g.setAttribute('cursor', 'pointer');
      g.addEventListener('click', () => {
        this.selectedPersonId = n.id;
        this.renderPersonChips();
        this.renderSelectedPersonCard();
        this.renderStandaloneCanvas(this.currentQuiz);
      });

      const fillColor = n.phenotypeId === 'trait-gray' ? 'hsl(215, 10%, 80%)' : '#ffffff';
      const isSelected = n.id === this.selectedPersonId;

      // Outer Selection Ring
      if (isSelected) {
        const ring = document.createElementNS('http://www.w3.org/2000/svg', n.gender === 'male' ? 'rect' : 'circle');
        if (n.gender === 'male') {
          ring.setAttribute('x', n.x - 33);
          ring.setAttribute('y', n.y - 33);
          ring.setAttribute('width', '66');
          ring.setAttribute('height', '66');
          ring.setAttribute('rx', '6');
        } else {
          ring.setAttribute('cx', n.x);
          ring.setAttribute('cy', n.y);
          ring.setAttribute('r', '33');
        }
        ring.setAttribute('fill', 'none');
        ring.setAttribute('stroke', '#2563eb');
        ring.setAttribute('stroke-width', '3');
        ring.setAttribute('filter', 'url(#selection-glow)');
        g.appendChild(ring);
      }

      // Check evaluation result for node n
      const res = this.individualResults[n.id];
      const valids = quizData.validAnswers ? (quizData.validAnswers[n.id] || []) : [];
      const trueGtDisplay = valids.join('/') || n._trueGenotype || '';

      let strokeColor = '#1e293b';
      let strokeWidth = '2.5';

      if (res) {
        if (res.isCorrect) {
          strokeColor = '#16a34a'; // Green for correct answer
          strokeWidth = '3.5';
        } else {
          strokeColor = '#dc2626'; // RED for incorrect answer!
          strokeWidth = '4.5';
        }
      }

      // Shape (Square / Circle)
      if (n.gender === 'male') {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', n.x - 27);
        rect.setAttribute('y', n.y - 27);
        rect.setAttribute('width', '54');
        rect.setAttribute('height', '54');
        rect.setAttribute('rx', '4');
        rect.setAttribute('ry', '4');
        rect.setAttribute('fill', fillColor);
        rect.setAttribute('stroke', strokeColor);
        rect.setAttribute('stroke-width', strokeWidth);
        rect.setAttribute('filter', 'url(#shadow)');
        g.appendChild(rect);
      } else {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', n.x);
        circle.setAttribute('cy', n.y);
        circle.setAttribute('r', '27');
        circle.setAttribute('fill', fillColor);
        circle.setAttribute('stroke', strokeColor);
        circle.setAttribute('stroke-width', strokeWidth);
        circle.setAttribute('filter', 'url(#shadow)');
        g.appendChild(circle);
      }

      // Label (가), (나)...
      const textLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textLabel.setAttribute('x', n.x);
      textLabel.setAttribute('y', n.y + 45);
      textLabel.setAttribute('text-anchor', 'middle');
      textLabel.setAttribute('font-size', '14');
      textLabel.setAttribute('font-weight', '700');
      textLabel.setAttribute('fill', '#1e293b');
      textLabel.textContent = n.label;
      g.appendChild(textLabel);

      // Genotype & Phenotype Text inside shape center
      const userGenotype = this.userAnswers[n.id];
      if (quizData.traitType === 'blood_type') {
        const bloodTypeStr = n._bloodType || '';
        if (res && !res.isCorrect) {
          // Incorrect: Display True Correct Genotype in RED!
          const textBlood = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          textBlood.setAttribute('x', n.x);
          textBlood.setAttribute('y', n.y - 4);
          textBlood.setAttribute('text-anchor', 'middle');
          textBlood.setAttribute('font-size', '12');
          textBlood.setAttribute('font-weight', '700');
          textBlood.setAttribute('fill', '#dc2626');
          textBlood.textContent = bloodTypeStr;
          g.appendChild(textBlood);

          const textGt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          textGt.setAttribute('x', n.x);
          textGt.setAttribute('y', n.y + 14);
          textGt.setAttribute('text-anchor', 'middle');
          textGt.setAttribute('font-size', '13');
          textGt.setAttribute('font-weight', '700');
          textGt.setAttribute('fill', '#dc2626');
          textGt.textContent = trueGtDisplay;
          g.appendChild(textGt);

        } else if (userGenotype && userGenotype !== '?') {
          // 2-line rendering: Blood Type on top, User Answer on bottom
          const textBlood = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          textBlood.setAttribute('x', n.x);
          textBlood.setAttribute('y', n.y - 4);
          textBlood.setAttribute('text-anchor', 'middle');
          textBlood.setAttribute('font-size', '12');
          textBlood.setAttribute('font-weight', '700');
          textBlood.setAttribute('fill', '#475569');
          textBlood.textContent = bloodTypeStr;
          g.appendChild(textBlood);

          const textGt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          textGt.setAttribute('x', n.x);
          textGt.setAttribute('y', n.y + 14);
          textGt.setAttribute('text-anchor', 'middle');
          textGt.setAttribute('font-size', '14');
          textGt.setAttribute('font-weight', '700');
          textGt.setAttribute('fill', res && res.isCorrect ? '#16a34a' : '#2563eb');
          textGt.textContent = userGenotype;
          g.appendChild(textGt);
        } else {
          // Unanswered: Blood Type centered inside shape
          const textBlood = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          textBlood.setAttribute('x', n.x);
          textBlood.setAttribute('y', n.y + 5);
          textBlood.setAttribute('text-anchor', 'middle');
          textBlood.setAttribute('font-size', '15');
          textBlood.setAttribute('font-weight', '700');
          textBlood.setAttribute('fill', '#1e293b');
          textBlood.textContent = bloodTypeStr;
          g.appendChild(textBlood);
        }
      } else {
        // Standard trait: Genotype Text in center
        if (res && !res.isCorrect) {
          // Incorrect: Display True Correct Genotype in RED!
          const textGt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          textGt.setAttribute('x', n.x);
          textGt.setAttribute('y', n.y + 6);
          textGt.setAttribute('text-anchor', 'middle');
          textGt.setAttribute('font-size', '15');
          textGt.setAttribute('font-weight', '700');
          textGt.setAttribute('fill', '#dc2626');
          textGt.textContent = trueGtDisplay;
          g.appendChild(textGt);
        } else if (res && res.isCorrect) {
          // Correct: Display in Green!
          const textGt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          textGt.setAttribute('x', n.x);
          textGt.setAttribute('y', n.y + 6);
          textGt.setAttribute('text-anchor', 'middle');
          textGt.setAttribute('font-size', '16');
          textGt.setAttribute('font-weight', '700');
          textGt.setAttribute('fill', '#16a34a');
          textGt.textContent = userGenotype;
          g.appendChild(textGt);
        } else {
          // Unanswered
          const textGt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          textGt.setAttribute('x', n.x);
          textGt.setAttribute('y', n.y + 6);
          textGt.setAttribute('text-anchor', 'middle');
          textGt.setAttribute('font-size', '16');
          textGt.setAttribute('font-weight', '700');
          textGt.setAttribute('fill', '#1e293b');
          textGt.textContent = userGenotype || '?';
          g.appendChild(textGt);
        }
      }

      nodesGroup.appendChild(g);
    });

    if (legendGroup) legendGroup.innerHTML = '';
    this.applyTransform();
  }

  openLegendModal() {
    const modal = document.getElementById('quiz-legend-modal');
    if (!modal) return;
    this.renderLegendModalContent();
    modal.classList.remove('hidden');
  }

  renderLegendModalContent() {
    const content = document.getElementById('legend-modal-content');
    const titleEl = document.getElementById('legend-modal-title');
    const subEl = document.getElementById('legend-modal-subtitle');
    if (!content) return;

    if (this.selectedTrait === 'double_eyelid') {
      if (titleEl) titleEl.textContent = '📖 쌍꺼풀 유전 범례 (상염색체)';
      if (subEl) subEl.textContent = '가계도 도형 및 색상별 특징 안내';
      content.innerHTML = `
        <div class="legend-swatch-item">
          <div class="legend-swatch-icon female white"></div>
          <div class="legend-swatch-info">
            <strong>흰색 동그라미 (여성)</strong>
            <span>쌍꺼풀이 있는 여성</span>
          </div>
        </div>
        <div class="legend-swatch-item">
          <div class="legend-swatch-icon male white"></div>
          <div class="legend-swatch-info">
            <strong>흰색 네모 (남성)</strong>
            <span>쌍꺼풀이 있는 남성</span>
          </div>
        </div>
        <div class="legend-swatch-item">
          <div class="legend-swatch-icon female gray"></div>
          <div class="legend-swatch-info">
            <strong>회색 동그라미 (여성)</strong>
            <span>쌍꺼풀이 없는(외꺼풀) 여성</span>
          </div>
        </div>
        <div class="legend-swatch-item">
          <div class="legend-swatch-icon male gray"></div>
          <div class="legend-swatch-info">
            <strong>회색 네모 (남성)</strong>
            <span>쌍꺼풀이 없는(외꺼풀) 남성</span>
          </div>
        </div>
      `;
    } else if (this.selectedTrait === 'blood_type') {
      if (titleEl) titleEl.textContent = '📖 ABO 혈액형 유전 범례 (복대립)';
      if (subEl) subEl.textContent = '가계도 성별 도형 및 표현형 안내';
      content.innerHTML = `
        <div class="legend-swatch-item">
          <div class="legend-swatch-icon female white"></div>
          <div class="legend-swatch-info">
            <strong>동그라미 노드 (여성)</strong>
            <span>여성 (도형 중앙에 해당 혈액형 표기)</span>
          </div>
        </div>
        <div class="legend-swatch-item">
          <div class="legend-swatch-icon male white"></div>
          <div class="legend-swatch-info">
            <strong>네모 노드 (남성)</strong>
            <span>남성 (도형 중앙에 해당 혈액형 표기)</span>
          </div>
        </div>
      `;
    } else if (this.selectedTrait === 'color_blindness') {
      if (titleEl) titleEl.textContent = '📖 적록 색맹 유전 범례 (반성 열성)';
      if (subEl) subEl.textContent = '가계도 도형 및 색상별 특징 안내';
      content.innerHTML = `
        <div class="legend-swatch-item">
          <div class="legend-swatch-icon female white"></div>
          <div class="legend-swatch-info">
            <strong>흰색 동그라미 (여성)</strong>
            <span>정상 (또는 보인자) 여성</span>
          </div>
        </div>
        <div class="legend-swatch-item">
          <div class="legend-swatch-icon male white"></div>
          <div class="legend-swatch-info">
            <strong>흰색 네모 (남성)</strong>
            <span>정상 남성</span>
          </div>
        </div>
        <div class="legend-swatch-item">
          <div class="legend-swatch-icon female gray"></div>
          <div class="legend-swatch-info">
            <strong>회색 동그라미 (여성)</strong>
            <span>적록 색맹인 여성</span>
          </div>
        </div>
        <div class="legend-swatch-item">
          <div class="legend-swatch-icon male gray"></div>
          <div class="legend-swatch-info">
            <strong>회색 네모 (남성)</strong>
            <span>적록 색맹인 남성</span>
          </div>
        </div>
      `;
    }
  }

  /**
   * 가계도 토폴로지 패턴 정의 (4가지 다양한 가계도 형태)
   */
  getPedigreePatterns() {
    return [
      // Pattern 1: 3세대 좌측 자녀 결혼 (8명)
      {
        id: 'pattern-1',
        name: '패턴 A (좌측 자녀 가정)',
        nodes: [
          { id: 'quiz-1', gender: 'male',   x: 310, y: 90,  label: '(가)' },
          { id: 'quiz-2', gender: 'female', x: 390, y: 90,  label: '(나)' },
          { id: 'quiz-3', gender: 'male',   x: 270, y: 220, label: '(다)' },
          { id: 'quiz-4', gender: 'female', x: 430, y: 220, label: '(라)' },
          { id: 'quiz-5', gender: 'female', x: 350, y: 220, label: '(마)' },
          { id: 'quiz-6', gender: 'male',   x: 230, y: 350, label: '(바)' },
          { id: 'quiz-7', gender: 'female', x: 310, y: 350, label: '(사)' },
          { id: 'quiz-8', gender: 'male',   x: 390, y: 350, label: '(아)' }
        ],
        connections: [
          { id: 'conn-s-12', type: 'spouse', spouse1Id: 'quiz-1', spouse2Id: 'quiz-2' },
          { id: 'conn-c-12', type: 'child', spouseConnId: 'conn-s-12', childrenIds: ['quiz-3', 'quiz-4'] },
          { id: 'conn-s-35', type: 'spouse', spouse1Id: 'quiz-3', spouse2Id: 'quiz-5' },
          { id: 'conn-c-35', type: 'child', spouseConnId: 'conn-s-35', childrenIds: ['quiz-6', 'quiz-7', 'quiz-8'] }
        ],
        geneticsMap: {
          gen1Couples: [{ p1: 'quiz-1', p2: 'quiz-2', children: ['quiz-3', 'quiz-4'] }],
          spouses: [{ p1: 'quiz-3', p2: 'quiz-5', children: ['quiz-6', 'quiz-7', 'quiz-8'] }]
        }
      },

      // Pattern 2: 3세대 우측 자녀 결혼 (8명)
      {
        id: 'pattern-2',
        name: '패턴 B (우측 자녀 가정)',
        nodes: [
          { id: 'quiz-1', gender: 'male',   x: 290, y: 90,  label: '(가)' },
          { id: 'quiz-2', gender: 'female', x: 370, y: 90,  label: '(나)' },
          { id: 'quiz-3', gender: 'female', x: 230, y: 220, label: '(다)' },
          { id: 'quiz-4', gender: 'male',   x: 390, y: 220, label: '(라)' },
          { id: 'quiz-5', gender: 'female', x: 470, y: 220, label: '(마)' },
          { id: 'quiz-6', gender: 'male',   x: 330, y: 350, label: '(바)' },
          { id: 'quiz-7', gender: 'female', x: 410, y: 350, label: '(사)' },
          { id: 'quiz-8', gender: 'male',   x: 490, y: 350, label: '(아)' }
        ],
        connections: [
          { id: 'conn-s-12', type: 'spouse', spouse1Id: 'quiz-1', spouse2Id: 'quiz-2' },
          { id: 'conn-c-12', type: 'child', spouseConnId: 'conn-s-12', childrenIds: ['quiz-3', 'quiz-4'] },
          { id: 'conn-s-45', type: 'spouse', spouse1Id: 'quiz-4', spouse2Id: 'quiz-5' },
          { id: 'conn-c-45', type: 'child', spouseConnId: 'conn-s-45', childrenIds: ['quiz-6', 'quiz-7', 'quiz-8'] }
        ],
        geneticsMap: {
          gen1Couples: [{ p1: 'quiz-1', p2: 'quiz-2', children: ['quiz-3', 'quiz-4'] }],
          spouses: [{ p1: 'quiz-4', p2: 'quiz-5', children: ['quiz-6', 'quiz-7', 'quiz-8'] }]
        }
      },

      // Pattern 3: 3세대 양쪽 자녀 모두 결혼 (8명)
      {
        id: 'pattern-3',
        name: '패턴 C (양가 삼촌/고모 가정)',
        nodes: [
          { id: 'quiz-1', gender: 'male',   x: 320, y: 90,  label: '(가)' },
          { id: 'quiz-2', gender: 'female', x: 400, y: 90,  label: '(나)' },
          { id: 'quiz-3', gender: 'male',   x: 200, y: 220, label: '(다)' },
          { id: 'quiz-4', gender: 'female', x: 280, y: 220, label: '(라)' },
          { id: 'quiz-5', gender: 'female', x: 440, y: 220, label: '(마)' },
          { id: 'quiz-6', gender: 'male',   x: 520, y: 220, label: '(바)' },
          { id: 'quiz-7', gender: 'female', x: 240, y: 350, label: '(사)' },
          { id: 'quiz-8', gender: 'male',   x: 480, y: 350, label: '(아)' }
        ],
        connections: [
          { id: 'conn-s-12', type: 'spouse', spouse1Id: 'quiz-1', spouse2Id: 'quiz-2' },
          { id: 'conn-c-12', type: 'child', spouseConnId: 'conn-s-12', childrenIds: ['quiz-3', 'quiz-5'] },
          { id: 'conn-s-34', type: 'spouse', spouse1Id: 'quiz-3', spouse2Id: 'quiz-4' },
          { id: 'conn-c-34', type: 'child', spouseConnId: 'conn-s-34', childrenIds: ['quiz-7'] },
          { id: 'conn-s-56', type: 'spouse', spouse1Id: 'quiz-5', spouse2Id: 'quiz-6' },
          { id: 'conn-c-56', type: 'child', spouseConnId: 'conn-s-56', childrenIds: ['quiz-8'] }
        ],
        geneticsMap: {
          gen1Couples: [{ p1: 'quiz-1', p2: 'quiz-2', children: ['quiz-3', 'quiz-5'] }],
          spouses: [
            { p1: 'quiz-3', p2: 'quiz-4', children: ['quiz-7'] },
            { p1: 'quiz-5', p2: 'quiz-6', children: ['quiz-8'] }
          ]
        }
      },

      // Pattern 4: 3자녀 중 중간 자녀 결혼 (9명)
      {
        id: 'pattern-4',
        name: '패턴 D (3자녀 대가족 가정)',
        nodes: [
          { id: 'quiz-1', gender: 'male',   x: 340, y: 90,  label: '(가)' },
          { id: 'quiz-2', gender: 'female', x: 420, y: 90,  label: '(나)' },
          { id: 'quiz-3', gender: 'female', x: 190, y: 220, label: '(다)' },
          { id: 'quiz-4', gender: 'male',   x: 340, y: 220, label: '(라)' },
          { id: 'quiz-5', gender: 'female', x: 420, y: 220, label: '(마)' },
          { id: 'quiz-6', gender: 'male',   x: 570, y: 220, label: '(바)' },
          { id: 'quiz-7', gender: 'male',   x: 300, y: 350, label: '(사)' },
          { id: 'quiz-8', gender: 'female', x: 380, y: 350, label: '(아)' },
          { id: 'quiz-9', gender: 'male',   x: 460, y: 350, label: '(자)' }
        ],
        connections: [
          { id: 'conn-s-12', type: 'spouse', spouse1Id: 'quiz-1', spouse2Id: 'quiz-2' },
          { id: 'conn-c-12', type: 'child', spouseConnId: 'conn-s-12', childrenIds: ['quiz-3', 'quiz-4', 'quiz-6'] },
          { id: 'conn-s-45', type: 'spouse', spouse1Id: 'quiz-4', spouse2Id: 'quiz-5' },
          { id: 'conn-c-45', type: 'child', spouseConnId: 'conn-s-45', childrenIds: ['quiz-7', 'quiz-8', 'quiz-9'] }
        ],
        geneticsMap: {
          gen1Couples: [{ p1: 'quiz-1', p2: 'quiz-2', children: ['quiz-3', 'quiz-4', 'quiz-6'] }],
          spouses: [{ p1: 'quiz-4', p2: 'quiz-5', children: ['quiz-7', 'quiz-8', 'quiz-9'] }]
        }
      }
    ];
  }

  /**
   * 부모가 모두 우성 표현형인데 자녀 중 하나가 열성 표현형을 가지는 핵심 추론 케이스가 존재하는지 검증
   */
  hasDominantParentsRecessiveChildCase(nodes, connections, traitType) {
    const spouseConns = connections.filter(c => c.type === 'spouse');
    const childConns = connections.filter(c => c.type === 'child');

    for (const sc of spouseConns) {
      const p1 = nodes.find(n => n.id === sc.spouse1Id);
      const p2 = nodes.find(n => n.id === sc.spouse2Id);
      if (!p1 || !p2) continue;

      const cc = childConns.find(c => c.spouseConnId === sc.id);
      if (!cc || !cc.childrenIds || cc.childrenIds.length === 0) continue;

      const children = nodes.filter(n => cc.childrenIds.includes(n.id));

      if (traitType === 'double_eyelid') {
        // 부모 모두 우성(흰색 - 쌍꺼풀 EE/Ee), 자녀 중 열성(회색 - 외꺼풀/쌍꺼풀 없음 ee) 존재
        const bothDominant = p1.phenotypeId === 'trait-white' && p2.phenotypeId === 'trait-white';
        const hasRecessiveChild = children.some(ch => ch.phenotypeId === 'trait-gray');
        if (bothDominant && hasRecessiveChild) return true;
      } else if (traitType === 'color_blindness') {
        // 부모 모두 우성(흰색 - 정상/보인자 XY/XX'), 자녀 중 열성(회색 - 색맹 X'Y / X'X') 존재
        const bothDominant = p1.phenotypeId === 'trait-white' && p2.phenotypeId === 'trait-white';
        const hasRecessiveChild = children.some(ch => ch.phenotypeId === 'trait-gray');
        if (bothDominant && hasRecessiveChild) return true;
      } else if (traitType === 'blood_type') {
        // 부모 모두 우성(A형 또는 B형 등 non-O형 표현형), 자녀 중 열성(O형) 존재
        const b1 = p1._bloodType;
        const b2 = p2._bloodType;
        const bothDominant = b1 !== 'O형' && b2 !== 'O형' && (b1 === b2 || (b1 === 'A형' && b2 === 'B형') || (b1 === 'B형' && b2 === 'A형'));
        const hasOChild = children.some(ch => ch._bloodType === 'O형');
        if (bothDominant && hasOChild) return true;
      }
    }

    return false;
  }

  /**
   * 1. 쌍꺼풀 유전 가계도 생성 (상염색체 우성 E / 열성 e)
   * 조건: 흰색/회색 개수 균형(|whiteCount - grayCount| <= 2) AND 부모 우성->자녀 열성 필수 케이스 보장
   */
  generateDoubleEyelidQuiz() {
    const patterns = this.getPedigreePatterns();
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];

    let selectedNodes = null;
    let selectedConnections = null;
    let validAnswers = null;
    let attempt = 0;

    while (attempt < 200) {
      attempt++;
      const { nodes, connections, whiteCount, grayCount } = this.buildDoubleEyelidNodes(pattern);

      const isBalanced = Math.abs(whiteCount - grayCount) <= 2;
      const hasKeyCase = this.hasDominantParentsRecessiveChildCase(nodes, connections, 'double_eyelid');

      if (isBalanced && hasKeyCase) {
        const answers = this.deduceDoubleEyelidValidGenotypes(nodes, connections);
        if (answers && Object.keys(answers).length === nodes.length) {
          selectedNodes = nodes;
          selectedConnections = connections;
          validAnswers = answers;
          break;
        }
      }
    }

    if (!selectedNodes) {
      const { nodes, connections } = this.buildDoubleEyelidNodes(pattern, true);
      selectedNodes = nodes;
      selectedConnections = connections;
      validAnswers = this.deduceDoubleEyelidValidGenotypes(nodes, connections);
    }

    return {
      title: '쌍꺼풀 유전 추론 (상염색체 우성/열성)',
      traitType: 'double_eyelid',
      alleleSymbols: ['E', 'e'],
      nodes: selectedNodes,
      connections: selectedConnections,
      validAnswers,
      legendTexts: [
        '흰색 (쌍꺼풀) (여)',
        '흰색 (쌍꺼풀) (남)',
        '회색 (외꺼풀) (여)',
        '회색 (외꺼풀) (남)'
      ]
    };
  }

  buildDoubleEyelidNodes(pattern, forceFallback = false) {
    const genotypesMap = {};

    const pickFounder = () => {
      const rand = Math.random();
      if (rand < 0.20) return ['E', 'E'];
      if (rand < 0.70) return ['E', 'e'];
      return ['e', 'e'];
    };

    const makeChild = (p1Gt, p2Gt) => {
      const a1 = p1Gt[Math.floor(Math.random() * 2)];
      const a2 = p2Gt[Math.floor(Math.random() * 2)];
      return [a1, a2].sort();
    };

    pattern.geneticsMap.gen1Couples.forEach(c => {
      genotypesMap[c.p1] = pickFounder();
      genotypesMap[c.p2] = pickFounder();
      c.children.forEach(chId => {
        genotypesMap[chId] = makeChild(genotypesMap[c.p1], genotypesMap[c.p2]);
      });
    });

    pattern.geneticsMap.spouses.forEach(s => {
      if (!genotypesMap[s.p1]) genotypesMap[s.p1] = pickFounder();
      if (!genotypesMap[s.p2]) genotypesMap[s.p2] = pickFounder();
      s.children.forEach(chId => {
        genotypesMap[chId] = makeChild(genotypesMap[s.p1], genotypesMap[s.p2]);
      });
    });

    let whiteCount = 0;
    let grayCount = 0;
    Object.values(genotypesMap).forEach(gt => {
      const gtStr = gt.join('');
      if (gtStr === 'ee') {
        grayCount++;
      } else {
        whiteCount++;
      }
    });

    const getPhenotypeId = (gtStr) => (gtStr === 'ee' ? 'trait-gray' : 'trait-white');

    const nodes = pattern.nodes.map(n => {
      const gtStr = genotypesMap[n.id].join('');
      return {
        id: n.id,
        gender: n.gender,
        x: n.x,
        y: n.y,
        label: n.label,
        genotype: '?',
        phenotypeId: getPhenotypeId(gtStr),
        _trueGenotype: gtStr
      };
    });

    const connections = pattern.connections.map(c => ({ ...c }));

    return { nodes, connections, whiteCount, grayCount };
  }

  /**
   * 2. ABO 혈액형 유전 가계도 생성 (복대립 유전 A, B, O)
   * 조건: 흰색/회색 개수 균형(|whiteCount - grayCount| <= 2) AND 부모 우성(non-O)->자녀 열성(O형) 필수 케이스 보장
   */
  generateBloodTypeQuiz() {
    const patterns = this.getPedigreePatterns();
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];

    let selectedNodes = null;
    let selectedConnections = null;
    let validAnswers = null;
    let attempt = 0;

    while (attempt < 200) {
      attempt++;
      const { nodes, connections } = this.buildBloodTypeNodes(pattern);

      const bloodTypesPresent = new Set(nodes.map(n => n._bloodType)).size;
      const isDiverse = bloodTypesPresent >= 3;
      const hasKeyCase = this.hasDominantParentsRecessiveChildCase(nodes, connections, 'blood_type');

      if (isDiverse && hasKeyCase) {
        const answers = this.deduceBloodTypeValidGenotypes(nodes, connections);
        if (answers && Object.keys(answers).length === nodes.length) {
          selectedNodes = nodes;
          selectedConnections = connections;
          validAnswers = answers;
          break;
        }
      }
    }

    if (!selectedNodes) {
      const { nodes, connections } = this.buildBloodTypeNodes(pattern, true);
      selectedNodes = nodes;
      selectedConnections = connections;
      validAnswers = this.deduceBloodTypeValidGenotypes(nodes, connections);
    }

    return {
      title: 'ABO 혈액형 유전자형 추론 (복대립 유전)',
      traitType: 'blood_type',
      alleleSymbols: ['A', 'B', 'O'],
      nodes: selectedNodes,
      connections: selectedConnections,
      validAnswers,
      legendTexts: [
        '흰색 (A형, O형) (여)',
        '흰색 (A형, O형) (남)',
        '회색 (B형, AB형) (여)',
        '회색 (B형, AB형) (남)'
      ]
    };
  }

  buildBloodTypeNodes(pattern, forceFallback = false) {
    const genotypesMap = {};

    const pickFounder = () => {
      const list = ['AO', 'BO', 'AB', 'OO', 'AO', 'BO', 'AO', 'BO'];
      return list[Math.floor(Math.random() * list.length)];
    };

    const makeChild = (gt1, gt2) => {
      const a1List = gt1.split('');
      const a2List = gt2.split('');
      const a1 = a1List[Math.floor(Math.random() * 2)];
      const a2 = a2List[Math.floor(Math.random() * 2)];
      const pair = [a1, a2].sort();
      if (pair.includes('O')) {
        if (pair[0] === 'O' && pair[1] !== 'O') return pair[1] + 'O';
      }
      return pair.join('');
    };

    pattern.geneticsMap.gen1Couples.forEach(c => {
      genotypesMap[c.p1] = pickFounder();
      genotypesMap[c.p2] = pickFounder();
      c.children.forEach(chId => {
        genotypesMap[chId] = makeChild(genotypesMap[c.p1], genotypesMap[c.p2]);
      });
    });

    pattern.geneticsMap.spouses.forEach(s => {
      if (!genotypesMap[s.p1]) genotypesMap[s.p1] = pickFounder();
      if (!genotypesMap[s.p2]) genotypesMap[s.p2] = pickFounder();
      s.children.forEach(chId => {
        genotypesMap[chId] = makeChild(genotypesMap[s.p1], genotypesMap[s.p2]);
      });
    });

    const getPhenotypeName = (gt) => {
      if (gt === 'AA' || gt === 'AO') return 'A형';
      if (gt === 'BB' || gt === 'BO') return 'B형';
      if (gt === 'AB') return 'AB형';
      return 'O형';
    };

    const getPhenotypeId = (gt) => {
      const name = getPhenotypeName(gt);
      if (name === 'B형' || name === 'AB형') return 'trait-gray';
      return 'trait-white';
    };

    let whiteCount = 0;
    let grayCount = 0;
    pattern.nodes.forEach(n => {
      const gtStr = genotypesMap[n.id];
      const pId = getPhenotypeId(gtStr);
      if (pId === 'trait-gray') grayCount++;
      else whiteCount++;
    });

    const nodes = pattern.nodes.map(n => {
      const gtStr = genotypesMap[n.id];
      const phenoName = getPhenotypeName(gtStr);
      return {
        id: n.id,
        gender: n.gender,
        x: n.x,
        y: n.y,
        label: n.label,
        genotype: '?',
        phenotypeId: 'trait-white', // 혈액형 퀴즈는 모든 도형을 흰색으로 표시
        _trueGenotype: gtStr,
        _bloodType: phenoName
      };
    });

    const connections = pattern.connections.map(c => ({ ...c }));

    return { nodes, connections, whiteCount, grayCount };
  }

  /**
   * 3. 적록 색맹 유전 가계도 생성 (반성 열성 유전 X, X', Y)
   * 조건: 흰색/회색 개수 균형(|whiteCount - grayCount| <= 2) AND 부모 우성(정상)->자녀 열성(색맹) 필수 케이스 보장
   */
  generateColorBlindnessQuiz() {
    const patterns = this.getPedigreePatterns();
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];

    let selectedNodes = null;
    let selectedConnections = null;
    let validAnswers = null;
    let attempt = 0;

    while (attempt < 200) {
      attempt++;
      const { nodes, connections, whiteCount, grayCount } = this.buildColorBlindnessNodes(pattern);

      const isBalanced = Math.abs(whiteCount - grayCount) <= 2;
      const hasKeyCase = this.hasDominantParentsRecessiveChildCase(nodes, connections, 'color_blindness');

      if (isBalanced && hasKeyCase) {
        const answers = this.deduceColorBlindnessValidGenotypes(nodes, connections);
        if (answers && Object.keys(answers).length === nodes.length) {
          selectedNodes = nodes;
          selectedConnections = connections;
          validAnswers = answers;
          break;
        }
      }
    }

    if (!selectedNodes) {
      const { nodes, connections } = this.buildColorBlindnessNodes(pattern, true);
      selectedNodes = nodes;
      selectedConnections = connections;
      validAnswers = this.deduceColorBlindnessValidGenotypes(nodes, connections);
    }

    return {
      title: '적록 색맹 유전자형 추론 (반성 열성 유전)',
      traitType: 'color_blindness',
      alleleSymbols: ['X', "X'", 'Y'],
      nodes: selectedNodes,
      connections: selectedConnections,
      validAnswers,
      legendTexts: [
        '흰색 (정상 / 보인자) (여)',
        '흰색 (정상) (남)',
        '회색 (적록 색맹) (여)',
        '회색 (적록 색맹) (남)'
      ]
    };
  }

  buildColorBlindnessNodes(pattern, forceFallback = false) {
    const genotypesMap = {};
    const nodeGenderMap = {};
    pattern.nodes.forEach(n => nodeGenderMap[n.id] = n.gender);

    const pickMaleFounder = () => (Math.random() < 0.50 ? 'XY' : "X'Y");
    const pickFemaleFounder = () => {
      const r = Math.random();
      if (r < 0.30) return 'XX';
      if (r < 0.50) return "XX'";
      return "X'X'";
    };

    const makeSon = (motherGt) => {
      const motherAlleles = motherGt === 'XX' ? ['X', 'X'] : (motherGt === "X'X'" ? ["X'", "X'"] : ['X', "X'"]);
      return motherAlleles[Math.floor(Math.random() * 2)] + 'Y';
    };

    const makeDaughter = (fatherGt, motherGt) => {
      const fatherX = fatherGt.startsWith("X'") ? "X'" : 'X';
      const motherAlleles = motherGt === 'XX' ? ['X', 'X'] : (motherGt === "X'X'" ? ["X'", "X'"] : ['X', "X'"]);
      const motherX = motherAlleles[Math.floor(Math.random() * 2)];

      if (fatherX === "X'" && motherX === "X'") return "X'X'";
      if (fatherX === 'X' && motherX === 'X') return 'XX';
      return "XX'";
    };

    const makeChild = (chId, p1Id, p2Id) => {
      const chGender = nodeGenderMap[chId];
      const fatherId = nodeGenderMap[p1Id] === 'male' ? p1Id : p2Id;
      const motherId = nodeGenderMap[p1Id] === 'female' ? p1Id : p2Id;
      const fatherGt = genotypesMap[fatherId];
      const motherGt = genotypesMap[motherId];

      if (chGender === 'male') {
        return makeSon(motherGt);
      } else {
        return makeDaughter(fatherGt, motherGt);
      }
    };

    pattern.geneticsMap.gen1Couples.forEach(c => {
      genotypesMap[c.p1] = nodeGenderMap[c.p1] === 'male' ? pickMaleFounder() : pickFemaleFounder();
      genotypesMap[c.p2] = nodeGenderMap[c.p2] === 'male' ? pickMaleFounder() : pickFemaleFounder();
      c.children.forEach(chId => {
        genotypesMap[chId] = makeChild(chId, c.p1, c.p2);
      });
    });

    pattern.geneticsMap.spouses.forEach(s => {
      if (!genotypesMap[s.p1]) genotypesMap[s.p1] = nodeGenderMap[s.p1] === 'male' ? pickMaleFounder() : pickFemaleFounder();
      if (!genotypesMap[s.p2]) genotypesMap[s.p2] = nodeGenderMap[s.p2] === 'male' ? pickMaleFounder() : pickFemaleFounder();
      s.children.forEach(chId => {
        genotypesMap[chId] = makeChild(chId, s.p1, s.p2);
      });
    });

    let whiteCount = 0;
    let grayCount = 0;
    pattern.nodes.forEach(n => {
      const gt = genotypesMap[n.id];
      const isAffected = (n.gender === 'male' && gt === "X'Y") || (n.gender === 'female' && gt === "X'X'");
      if (isAffected) grayCount++;
      else whiteCount++;
    });

    const getPhenotypeId = (gt, gender) => {
      if (gender === 'male') {
        return gt === "X'Y" ? 'trait-gray' : 'trait-white';
      } else {
        return gt === "X'X'" ? 'trait-gray' : 'trait-white';
      }
    };

    const nodes = pattern.nodes.map(n => {
      const gtStr = genotypesMap[n.id];
      return {
        id: n.id,
        gender: n.gender,
        x: n.x,
        y: n.y,
        label: n.label,
        genotype: '?',
        phenotypeId: getPhenotypeId(gtStr, n.gender),
        _trueGenotype: gtStr
      };
    });

    const connections = pattern.connections.map(c => ({ ...c }));

    return { nodes, connections, whiteCount, grayCount };
  }

  // --- 유전자형 정답 과학적 추론 시스템 (Deduction Engine) ---

  normalizeGenotype(str) {
    if (!str) return '';
    let cleaned = String(str).trim().replace(/\s+/g, '');
    if (cleaned === '?' || cleaned === '알 수 없음') return '?';

    // 표기 교정 (X^c -> X', X^r -> X', etc)
    cleaned = cleaned.replace(/X\^c/gi, "X'").replace(/X\^r/gi, "X'").replace(/x'/gi, "X'");
    if (cleaned === 'eE') return 'Ee';

    // 혈액형 교정
    if (cleaned === 'oA' || cleaned === 'OA' || cleaned === 'Ao') return 'AO';
    if (cleaned === 'oB' || cleaned === 'OB' || cleaned === 'Bo') return 'BO';
    if (cleaned === 'BA') return 'AB';
    if (cleaned === 'oo') return 'OO';

    if (cleaned.length === 2 && !cleaned.includes('X') && !cleaned.includes('Y')) {
      const arr = cleaned.split('');
      if (arr.every(c => c.toUpperCase() === 'E')) {
        if (arr.includes('E') && arr.includes('e')) return 'Ee';
        if (arr.every(c => c === 'E')) return 'EE';
        if (arr.every(c => c === 'e')) return 'ee';
      }
    }

    return cleaned;
  }

  deduceDoubleEyelidValidGenotypes(nodes, connections) {
    const validMap = {};
    nodes.forEach(n => {
      const isRecessive = n.phenotypeId === 'trait-gray'; // 회색 = 외꺼풀 (ee)
      const trueGt = n._trueGenotype;

      if (isRecessive) {
        // 외꺼풀(회색)은 무조건 ee만 가능
        validMap[n.id] = ['ee'];
      } else {
        // 쌍꺼풀(흰색, E_)인 경우: EE 또는 Ee
        // 부모 중 외꺼풀(ee, 회색)이 있거나, 자녀 중 외꺼풀(ee, 회색)이 있으면 무조건 Ee
        let mustBeHetero = false;

        // 1. 자녀 검사
        const childConns = connections.filter(c => c.type === 'child');
        const mySpouseConn = connections.find(c => c.type === 'spouse' && (c.spouse1Id === n.id || c.spouse2Id === n.id));

        if (mySpouseConn) {
          const myChildConn = childConns.find(c => c.spouseConnId === mySpouseConn.id);
          if (myChildConn) {
            const children = nodes.filter(ch => myChildConn.childrenIds.includes(ch.id));
            if (children.some(ch => ch.phenotypeId === 'trait-gray')) {
              mustBeHetero = true;
            }
          }
        }

        // 2. 부모 검사
        childConns.forEach(cc => {
          if (cc.childrenIds.includes(n.id)) {
            const sc = connections.find(c => c.id === cc.spouseConnId);
            if (sc) {
              const p1 = nodes.find(p => p.id === sc.spouse1Id);
              const p2 = nodes.find(p => p.id === sc.spouse2Id);
              if ((p1 && p1.phenotypeId === 'trait-gray') || (p2 && p2.phenotypeId === 'trait-gray')) {
                mustBeHetero = true;
              }
            }
          }
        });

        if (mustBeHetero) {
          validMap[n.id] = ['Ee'];
        } else {
          // EE 또는 Ee 둘 다 과학적으로 가능하면 둘 다 정답 인정
          validMap[n.id] = ['EE', 'Ee'];
        }
      }
    });

    return validMap;
  }

  deduceBloodTypeValidGenotypes(nodes, connections) {
    const validMap = {};

    // 1. 초기 가능 유전자형 설정 (표현형 기준)
    nodes.forEach(n => {
      const blood = n._bloodType;
      if (blood === 'O형') {
        validMap[n.id] = ['OO'];
      } else if (blood === 'AB형') {
        validMap[n.id] = ['AB'];
      } else if (blood === 'A형') {
        validMap[n.id] = ['AA', 'AO'];
      } else if (blood === 'B형') {
        validMap[n.id] = ['BB', 'BO'];
      } else {
        validMap[n.id] = ['AA', 'AO', 'BB', 'BO', 'AB', 'OO'];
      }
    });

    // 멘델 복대립 유전 가능 여부 판별 헬퍼
    const canProduce = (g1, g2, gC) => {
      const a1List = g1.split('');
      const a2List = g2.split('');
      for (const a1 of a1List) {
        for (const a2 of a2List) {
          const pair = [a1, a2].sort();
          let offspringGt = pair.join('');
          if (pair.includes('O') && pair[0] === 'O' && pair[1] !== 'O') {
            offspringGt = pair[1] + 'O';
          }
          if (offspringGt === gC) return true;
        }
      }
      return false;
    };

    // 부모-자녀 가계 그룹 추출
    const families = [];
    const childConns = connections.filter(c => c.type === 'child');
    childConns.forEach(cc => {
      const sc = connections.find(c => c.id === cc.spouseConnId);
      if (sc && cc.childrenIds && cc.childrenIds.length > 0) {
        families.push({
          p1Id: sc.spouse1Id,
          p2Id: sc.spouse2Id,
          childrenIds: cc.childrenIds
        });
      }
    });

    // 제약 조건 전파 (최대 10회 반복 또는 수렴 시 종료)
    let changed = true;
    let iteration = 0;
    while (changed && iteration < 10) {
      changed = false;
      iteration++;

      families.forEach(fam => {
        const p1Id = fam.p1Id;
        const p2Id = fam.p2Id;
        const childrenIds = fam.childrenIds;

        const g1Set = validMap[p1Id] || [];
        const g2Set = validMap[p2Id] || [];

        // 1. 자녀의 유전자형 후보 소거 (부모 조합에서 나올 수 없는 경우 제거)
        childrenIds.forEach(chId => {
          const gCSet = validMap[chId] || [];
          const newGCSet = gCSet.filter(gC => {
            return g1Set.some(g1 => g2Set.some(g2 => canProduce(g1, g2, gC)));
          });
          if (newGCSet.length !== gCSet.length) {
            validMap[chId] = newGCSet;
            changed = true;
          }
        });

        const currentChildrenSets = childrenIds.map(chId => validMap[chId] || []);

        // 2. 부모1(p1) 유전자형 후보 소거 (자녀들을 만들어낼 수 없는 경우 제거)
        const newG1Set = g1Set.filter(g1 => {
          return currentChildrenSets.every(gCSet => {
            return gCSet.some(gC => g2Set.some(g2 => canProduce(g1, g2, gC)));
          });
        });
        if (newG1Set.length !== g1Set.length) {
          validMap[p1Id] = newG1Set;
          changed = true;
        }

        // 3. 부모2(p2) 유전자형 후보 소거 (자녀들을 만들어낼 수 없는 경우 제거)
        const updatedG1Set = validMap[p1Id] || [];
        const newG2Set = g2Set.filter(g2 => {
          return currentChildrenSets.every(gCSet => {
            return gCSet.some(gC => updatedG1Set.some(g1 => canProduce(g1, g2, gC)));
          });
        });
        if (newG2Set.length !== g2Set.length) {
          validMap[p2Id] = newG2Set;
          changed = true;
        }
      });
    }

    return validMap;
  }

  deduceColorBlindnessValidGenotypes(nodes, connections) {
    const validMap = {};
    nodes.forEach(n => {
      const isAffected = n.phenotypeId === 'trait-gray';

      if (n.gender === 'male') {
        // 남성은 표현형만 보고 100% 확정 (XY 또는 X'Y)
        validMap[n.id] = isAffected ? ["X'Y"] : ['XY'];
      } else {
        // 여성
        if (isAffected) {
          // 색맹 여성은 무조건 X'X'
          validMap[n.id] = ["X'X'"];
        } else {
          // 정상 여성: XX 또는 XX' (보인자)
          // 부모나 자녀에 의해 결정되는지 확인
          let mustBeCarrier = false;

          // 1. 아버지가 색맹(X'Y)이면 딸은 아버지에게 X'를 받으므로 무조건 보인자(XX')
          connections.filter(c => c.type === 'child').forEach(cc => {
            if (cc.childrenIds.includes(n.id)) {
              const sc = connections.find(c => c.id === cc.spouseConnId);
              if (sc) {
                const father = nodes.find(p => p.id === sc.spouse1Id && p.gender === 'male') ||
                               nodes.find(p => p.id === sc.spouse2Id && p.gender === 'male');
                if (father && father.phenotypeId === 'trait-gray') {
                  mustBeCarrier = true;
                }
              }
            }
          });

          // 2. 자녀 중 색맹 아들(X'Y)이 있으면 어머니는 X' 보유하므로 무조건 보인자(XX')
          const mySpouseConn = connections.find(c => c.type === 'spouse' && (c.spouse1Id === n.id || c.spouse2Id === n.id));
          if (mySpouseConn) {
            const myChildConn = connections.find(c => c.type === 'child' && c.spouseConnId === mySpouseConn.id);
            if (myChildConn) {
              const children = nodes.filter(ch => myChildConn.childrenIds.includes(ch.id));
              if (children.some(ch => ch.gender === 'male' && ch.phenotypeId === 'trait-gray')) {
                mustBeCarrier = true;
              }
            }
          }

          validMap[n.id] = mustBeCarrier ? ["XX'"] : ['XX', "XX'"];
        }
      }
    });

    return validMap;
  }

  getGenotypeCandidates(traitType, gender) {
    if (traitType === 'double_eyelid') {
      return ['EE', 'Ee', 'ee', '?'];
    } else if (traitType === 'blood_type') {
      return ['AA', 'AO', 'BB', 'BO', 'AB', 'OO', '?'];
    } else if (traitType === 'color_blindness') {
      return ['XY', "X'Y", 'XX', "XX'", "X'X'", '?'];
    }
    return ['EE', 'Ee', 'ee', '?'];
  }

  // --- UI 및 폼 업데이트 ---

  updateQuizInfoText() {
    if (!this.currentQuiz) return;
    const { title, traitType } = this.currentQuiz;

    if (this.quizInfoTitle) {
      this.quizInfoTitle.textContent = title;
    }

    if (this.quizInfoDesc) {
      if (traitType === 'double_eyelid') {
        this.quizInfoDesc.innerHTML = `
          <strong>[쌍꺼풀 유전 법칙]</strong><br>
          • 쌍꺼풀 대립 유전자(<b>E</b>)는 외꺼풀 대립 유전자(<b>e</b>)에 대해 우성입니다.<br>
          • 표현형: 흰색 노드 = 쌍꺼풀(EE 또는 Ee), 회색 노드 = 외꺼풀(ee)<br>
          • 캔버스의 가계도를 바탕으로 각 인물 <b>(가)~(아)</b>의 유전자형을 추론하여 입력하세요.
        `;
      } else if (traitType === 'blood_type') {
        this.quizInfoDesc.innerHTML = `
          <strong>[ABO 혈액형 유전 법칙]</strong><br>
          • 대립 유전자 <b>A</b>와 <b>B</b>는 우열 관계가 없고(우성), <b>O</b>에 대해서는 우성입니다.<br>
          • A형(AA, AO), B형(BB, BO), AB형(AB), O형(OO)<br>
          • 가계도의 각 인물의 표현형(혈액형)을 보고 유전자형을 정확히 추론하세요.
        `;
      } else if (traitType === 'color_blindness') {
        this.quizInfoDesc.innerHTML = `
          <strong>[적록 색맹 반성 유전 법칙]</strong><br>
          • 적록 색맹 유전자(<b>X'</b>)는 성염색체 X에 있는 열성 유전입니다.<br>
          • 남성: XY(정상), X'Y(색맹) / 여성: XX(정상), XX'(보인자), X'X'(색맹)<br>
          • 회색 노드는 색맹 발현자, 흰색 노드는 정상(또는 보인자) 표현형입니다.
        `;
      }
    }
  }

  renderInputForm() {
    if (!this.currentQuiz || !this.quizInputContainer) return;
    const { nodes, traitType } = this.currentQuiz;

    this.quizInputContainer.innerHTML = '';

    nodes.forEach(node => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'quiz-input-item';
      itemDiv.id = `quiz-item-${node.id}`;

      const res = this.individualResults[node.id];
      if (res) {
        itemDiv.classList.add(res.isCorrect ? 'correct' : 'incorrect');
      }

      const labelSpan = document.createElement('span');
      labelSpan.className = 'quiz-node-label';
      labelSpan.textContent = `${node.label}`;

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'quiz-input-field';
      input.id = `quiz-input-${node.id}`;
      input.placeholder = `예: ${this.getExampleGenotype()}`;
      input.autocomplete = 'off';

      const currentVal = this.userAnswers[node.id] || '';
      input.value = currentVal;

      const syncAndCheck = (val) => {
        this.userAnswers[node.id] = val;
        if (this.selectedPersonId === node.id) {
          const cardInput = document.getElementById('selected-person-input');
          if (cardInput) cardInput.value = val;
        }

        if (this.isEditorApp()) {
          const canvasNode = window.app.nodes.find(n => n.id === node.id);
          if (canvasNode) {
            canvasNode.genotype = val ? val : '?';
            window.app.renderAll();
          }
        }
        this.renderStandaloneCanvas(this.currentQuiz);
        if (val) {
          this.checkIndividualAnswer(node.id);
        } else {
          delete this.individualResults[node.id];
          this.renderPersonChips();
          this.renderSelectedPersonCard();
        }
      };

      input.addEventListener('input', (e) => {
        const val = e.target.value;
        this.userAnswers[node.id] = val;
        if (val === '?' || val.length >= 2) {
          syncAndCheck(val);
        } else {
          this.renderStandaloneCanvas(this.currentQuiz);
        }
      });

      // Quick candidate preset buttons for this node
      const btnGroup = document.createElement('div');
      btnGroup.className = 'quiz-allele-btns';

      const candidates = this.getGenotypeCandidates(traitType, node.gender);

      candidates.forEach(cand => {
        const btn = document.createElement('button');
        btn.type = 'button';
        const isActive = this.normalizeGenotype(currentVal) === this.normalizeGenotype(cand);
        btn.className = `btn-allele-sm ${isActive ? 'active' : ''} ${cand === '?' ? 'btn-unknown-sm' : ''}`;
        btn.textContent = cand;
        btn.addEventListener('click', () => {
          input.value = cand;
          syncAndCheck(cand);
        });
        btnGroup.appendChild(btn);
      });

      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'btn-allele-sm btn-clear-sm';
      clearBtn.textContent = 'C';
      clearBtn.title = '지우기';
      clearBtn.addEventListener('click', () => {
        input.value = '';
        delete this.individualResults[node.id];
        syncAndCheck('');
      });
      btnGroup.appendChild(clearBtn);

      itemDiv.appendChild(labelSpan);
      itemDiv.appendChild(input);
      itemDiv.appendChild(btnGroup);

      this.quizInputContainer.appendChild(itemDiv);
    });
  }

  getExampleGenotype() {
    if (this.selectedTrait === 'double_eyelid') return 'EE, Ee, ee, ?';
    if (this.selectedTrait === 'blood_type') return 'AO, AB, OO, ?';
    return "X'Y, XX', ?";
  }

  isAnswerCorrect(userVal, valids) {
    if (!userVal || !valids || valids.length === 0) return false;
    const normalizedUser = this.normalizeGenotype(userVal);

    // 1. 가능 유전자형이 오직 1개로 과학적으로 확정된 경우 (valids.length === 1)
    if (valids.length === 1) {
      const targetGt = this.normalizeGenotype(valids[0]);
      return normalizedUser === targetGt;
    }

    // 2. 가능 유전자형이 2개 이상이어서 하나로 단정/확정할 수 없는 경우 (valids.length > 1)
    // 오직 '?' (알 수 없음) 선택 시에만 정답 인정! (개별 후보 찍기 선택 시 오답)
    if (valids.length > 1) {
      return normalizedUser === '?';
    }

    return false;
  }

  /**
   * 사용자가 제출한 유전자형 검증 및 채점
   */
  checkAnswers() {
    if (!this.currentQuiz) return;
    const { nodes, validAnswers } = this.currentQuiz;

    let correctCount = 0;
    let totalCount = nodes.length;

    nodes.forEach(node => {
      const inputEl = document.getElementById(`quiz-input-${node.id}`);
      const itemEl = document.getElementById(`quiz-item-${node.id}`);

      const userVal = inputEl ? inputEl.value : '';
      const valids = validAnswers[node.id] || [];

      const isCorrect = this.isAnswerCorrect(userVal, valids);

      this.individualResults[node.id] = {
        isCorrect,
        userVal
      };

      if (itemEl) {
        itemEl.classList.remove('correct', 'incorrect');
        if (isCorrect) {
          itemEl.classList.add('correct');
          correctCount++;
        } else {
          itemEl.classList.add('incorrect');
        }
      }

      const canvasNode = window.app ? window.app.nodes.find(n => n.id === node.id) : null;
      if (canvasNode) {
        canvasNode.genotype = userVal ? userVal : '?';
      }
    });

    if (this.isEditorApp()) {
      window.app.renderAll();
    }
    this.renderPersonChips();
    this.renderSelectedPersonCard();

    // 결과 배너 렌더링
    if (this.quizResultBanner) {
      this.quizResultBanner.classList.remove('hidden', 'success', 'warning');
      const isPerfect = correctCount === totalCount;
      this.quizResultBanner.classList.add(isPerfect ? 'success' : 'warning');

      this.quizResultBanner.innerHTML = `
        <div class="result-score-title">
          <i class="fa-solid ${isPerfect ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i>
          <span>채점 결과: <strong>${correctCount} / ${totalCount}</strong> 명 정답!</span>
        </div>
        <p class="result-score-desc">
          ${isPerfect ? '축하합니다! 모든 인물의 유전자형을 완벽하게 추론했습니다 🎉' : '일부 인물의 유전자형 추론이 틀렸거나 미입력되었습니다.'}
        </p>
      `;
    }

    this.renderExplanations();

    // 모든 인물 문제 제출 완료 시 모달 팝업 띄우기
    const answeredCount = Object.keys(this.individualResults).length;
    if (answeredCount === totalCount) {
      setTimeout(() => {
        this.showCompletionModal();
      }, 350);
    }
  }

  renderExplanations() {
    if (!this.quizExplanationBox || !this.currentQuiz) return;
    const { nodes, validAnswers, traitType } = this.currentQuiz;

    let html = `<h4><i class="fa-solid fa-graduation-cap"></i> 인물별 정답 및 상세 유전 해설</h4><ul class="explanation-list">`;

    nodes.forEach(node => {
      const valids = validAnswers[node.id] || [];
      const validsStr = valids.join(' 또는 ');

      let reason = '';
      if (traitType === 'double_eyelid') {
        if (valids.includes('ee')) {
          reason = '외꺼풀 표현형(회색)이므로 유전자형은 열성 동형 접합 ee 입니다.';
        } else if (valids.length === 1 && valids[0] === 'Ee') {
          reason = '쌍꺼풀(우성, 흰색)이지만, 부모나 자녀 중 외꺼풀(ee, 회색)이 존재하여 반드시 e를 하나 보유하는 잡종 Ee 입니다.';
        } else {
          reason = '쌍꺼풀(우성, 흰색)이며, 열성 자녀나 부모가 없어 EE와 Ee 모두 가능합니다. ("?" 알 수 없음 표기도 정답)';
        }
      } else if (traitType === 'blood_type') {
        reason = `표현형(${node._bloodType}) 및 부모-자녀 혈액형 전달 관계에 의해 가능 유전자형은 ${validsStr} 입니다.`;
      } else if (traitType === 'color_blindness') {
        if (node.gender === 'male') {
          reason = node.phenotypeId === 'trait-gray' ? '색맹 남성이므로 X\'Y 입니다.' : '정상 남성이므로 XY 입니다.';
        } else {
          if (valids.includes("X'X'")) {
            reason = '색맹 여성이므로 X\'X\' 입니다.';
          } else if (valids.length === 1 && valids[0] === "XX'") {
            reason = '정상 표현형이나 아버지가 색맹(X\'Y)이거나 자녀에 색맹 아들이 있어 보인자 XX\' 입니다.';
          } else {
            reason = '정상 표현형이며 색맹 전달 인자가 확인되지 않아 XX와 XX\' 모두 가능합니다.';
          }
        }
      }

      html += `
        <li>
          <strong>${node.label}</strong>: 
          <span class="genotype-badge">${validsStr}</span>
          <p class="explanation-reason">${reason}</p>
        </li>
      `;
    });

    html += `</ul>`;
    this.quizExplanationBox.innerHTML = html;
  }

  toggleExplanations() {
    if (!this.quizExplanationBox) return;
    this.quizExplanationBox.classList.toggle('hidden');
    if (!this.quizExplanationBox.innerHTML.trim()) {
      this.renderExplanations();
    }
  }

  renderPersonChips() {
    if (!this.currentQuiz || !this.personChipsContainer) return;
    const { nodes } = this.currentQuiz;

    this.personChipsContainer.innerHTML = '';

    nodes.forEach(node => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `person-chip ${node.id === this.selectedPersonId ? 'active' : ''}`;

      const res = this.individualResults[node.id];
      let statusIcon = '?';
      if (res) {
        if (res.isCorrect) {
          chip.classList.add('correct');
          statusIcon = '✓';
        } else {
          chip.classList.add('incorrect');
          statusIcon = '✗';
        }
      }

      chip.innerHTML = `<span class="chip-label">${node.label}</span><span class="chip-status">${statusIcon}</span>`;

      chip.addEventListener('click', () => {
        this.selectedPersonId = node.id;
        this.renderPersonChips();
        this.renderSelectedPersonCard();
        if (this.isEditorApp()) {
          window.app.selectNode(node.id);
        }
        this.renderStandaloneCanvas(this.currentQuiz);
      });

      this.personChipsContainer.appendChild(chip);
    });
  }

  renderSelectedPersonCard() {
    if (!this.currentQuiz || !this.selectedCardContainer) return;
    const { nodes, validAnswers, traitType } = this.currentQuiz;

    const node = nodes.find(n => n.id === this.selectedPersonId) || nodes[0];
    if (!node) return;

    this.selectedPersonId = node.id;

    // Phenotype display description
    let phenotypeText = '';
    if (traitType === 'double_eyelid') {
      phenotypeText = node.phenotypeId === 'trait-gray' ? '외꺼풀 (회색)' : '쌍꺼풀 (흰색)';
    } else if (traitType === 'blood_type') {
      phenotypeText = `${node._bloodType}`;
    } else if (traitType === 'color_blindness') {
      if (node.gender === 'male') {
        phenotypeText = node.phenotypeId === 'trait-gray' ? '적록 색맹 (회색)' : '정상 (흰색)';
      } else {
        phenotypeText = node.phenotypeId === 'trait-gray' ? '적록 색맹 (회색)' : '정상/보인자 (흰색)';
      }
    }

    const currentVal = this.userAnswers[node.id] || '';
    const res = this.individualResults[node.id];
    const isLocked = !!res; // Locked once answered!

    let feedbackHtml = '';
    if (res) {
      const valids = validAnswers[node.id] || [];
      const validsStr = valids.join(' 또는 ');

      let reason = '';
      if (traitType === 'double_eyelid') {
        if (valids.includes('ee')) reason = '외꺼풀 표현형(회색)이므로 ee 입니다.';
        else if (valids.length === 1 && valids[0] === 'Ee') reason = '쌍꺼풀(흰색)이지만 열성(ee, 회색) 자녀/부모가 있어 Ee 입니다.';
        else reason = '쌍꺼풀(흰색)이며 열성 인자가 없어 EE와 Ee 모두 가능합니다.';
      } else if (traitType === 'blood_type') {
        reason = `표현형(${node._bloodType})에 의해 가능 유전자형은 ${validsStr} 입니다.`;
      } else if (traitType === 'color_blindness') {
        if (node.gender === 'male') reason = node.phenotypeId === 'trait-gray' ? "색맹 남성이므로 X'Y 입니다." : "정상 남성이므로 XY 입니다.";
        else reason = valids.includes("X'X'") ? "색맹 여성이므로 X'X' 입니다." : (valids.length === 1 ? "보인자 XX' 입니다." : "XX와 XX' 모두 가능합니다.");
      }

      if (res.isCorrect) {
        let noteHtml = '';
        if (currentVal === '?') {
          noteHtml = `<br><small class="feedback-reason" style="color:#15803d; font-weight:600;">💡 ${validsStr} 모두 가능하여 하나의 유전자형으로 확정할 수 없으므로 <strong>"알 수 없음(?)"</strong> 선택이 정답 처리되었습니다.</small>`;
        }
        feedbackHtml = `
          <div class="individual-feedback success">
            <div class="feedback-title"><i class="fa-solid fa-circle-check"></i> 정답입니다!</div>
            <p>${node.label}의 가능 유전자형: <strong>${validsStr}</strong></p>
            <small class="feedback-reason">${reason}</small>
            ${noteHtml}
          </div>
        `;
      } else {
        let noteHtml = '';
        if (valids.length > 1) {
          noteHtml = `<br><small class="feedback-reason" style="color:#b91c1c; font-weight:600;">💡 참고: ${validsStr} 모두 과학적으로 가능하므로 하나로 단정할 수 없으며, 개별 유전자형 선택 대신 반드시 <strong>"알 수 없음(?)"</strong>을 선택하셔야 정답으로 인정됩니다.</small>`;
        }
        feedbackHtml = `
          <div class="individual-feedback warning">
            <div class="feedback-title"><i class="fa-solid fa-circle-xmark"></i> 오답입니다! (정답 공개 & 재입력 불가)</div>
            <p>입력값(<strong>${currentVal || '미입력'}</strong>)이 틀렸습니다. 정답은 <strong>${validsStr}</strong> 입니다.</p>
            <small class="feedback-reason">${reason}</small>
            ${noteHtml}
          </div>
        `;
      }
    }

    const candidates = this.getGenotypeCandidates(traitType, node.gender);

    this.selectedCardContainer.innerHTML = `
      <div class="selected-person-card">
        <div class="selected-person-header">
          <div class="person-title">
            <span class="shape-icon-sm ${node.gender}">${node.gender === 'male' ? '■' : '●'}</span>
            <strong>${node.label} 유전자형 선택</strong>
          </div>
          <span class="phenotype-pill">${phenotypeText}</span>
        </div>

        <div class="selected-person-body">
          <label class="card-input-label">${isLocked ? '🔒 답변 제출 완료 (재입력 불가)' : '원클릭 입력 선택 (누르는 즉시 정답 확인):'}</label>
          
          <div class="genotype-preset-group">
            ${candidates.map(cand => {
              const isUnknown = cand === '?';
              const label = isUnknown ? '? (알 수 없음)' : cand;
              const isActive = this.normalizeGenotype(currentVal) === this.normalizeGenotype(cand);
              return `<button type="button" class="btn-genotype-preset ${isUnknown ? 'preset-unknown' : ''} ${isActive ? 'active' : ''}" data-value="${cand}" ${isLocked ? 'disabled' : ''}>${label}</button>`;
            }).join('')}
          </div>

          <div class="input-with-clear" style="margin-top: 4px;">
            <input type="text" id="selected-person-input" class="quiz-input-field card-input" value="${currentVal}" placeholder="직접 입력 (예: ${this.getExampleGenotype()})" autocomplete="off" ${isLocked ? 'disabled' : ''}>
            <button type="button" id="selected-person-clear" class="btn-allele-sm btn-clear-sm" title="지우기" ${isLocked ? 'disabled' : ''}>C</button>
          </div>

          ${feedbackHtml}
        </div>
      </div>
    `;

    const inputEl = document.getElementById('selected-person-input');
    const clearEl = document.getElementById('selected-person-clear');

    const handleSelectGenotype = (val) => {
      this.userAnswers[node.id] = val;
      const mainGridInput = document.getElementById(`quiz-input-${node.id}`);
      if (mainGridInput) mainGridInput.value = val;

      if (this.isEditorApp()) {
        const canvasNode = window.app.nodes.find(n => n.id === node.id);
        if (canvasNode) {
          canvasNode.genotype = val ? val : '?';
          window.app.renderAll();
        }
      }
      this.renderStandaloneCanvas(this.currentQuiz);
      if (val) {
        this.checkIndividualAnswer(node.id);
      } else {
        delete this.individualResults[node.id];
        this.renderPersonChips();
        this.renderSelectedPersonCard();
      }
    };

    if (inputEl) {
      inputEl.addEventListener('input', (e) => {
        const val = e.target.value;
        this.userAnswers[node.id] = val;
        const mainGridInput = document.getElementById(`quiz-input-${node.id}`);
        if (mainGridInput) mainGridInput.value = val;

        if (this.isEditorApp()) {
          const canvasNode = window.app.nodes.find(n => n.id === node.id);
          if (canvasNode) {
            canvasNode.genotype = val ? val : '?';
            window.app.renderAll();
          }
        }
        this.renderStandaloneCanvas(this.currentQuiz);

        if (val === '?' || val.length >= 2) {
          this.checkIndividualAnswer(node.id);
        }
      });
    }

    if (clearEl) {
      clearEl.addEventListener('click', () => {
        delete this.individualResults[node.id];
        handleSelectGenotype('');
      });
    }

    this.selectedCardContainer.querySelectorAll('.btn-genotype-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-value');
        handleSelectGenotype(val);
      });
    });
  }

  checkIndividualAnswer(nodeId) {
    if (!this.currentQuiz) return;
    const { validAnswers } = this.currentQuiz;

    const userVal = this.userAnswers[nodeId] || '';
    const valids = validAnswers[nodeId] || [];

    const isCorrect = this.isAnswerCorrect(userVal, valids);

    this.individualResults[nodeId] = {
      isCorrect,
      userVal
    };

    this.updateScoreBadge();
    this.renderPersonChips();
    this.renderSelectedPersonCard();
    this.renderStandaloneCanvas(this.currentQuiz);

    // Check if ALL questions have been answered
    const totalCount = this.currentQuiz.nodes.length;
    const answeredCount = Object.keys(this.individualResults).length;

    if (answeredCount === totalCount) {
      setTimeout(() => {
        this.showCompletionModal();
      }, 350);
    }
  }

  showCompletionModal() {
    if (!this.currentQuiz) return;
    const { nodes } = this.currentQuiz;
    const totalCount = nodes.length;

    let correctCount = 0;
    nodes.forEach(n => {
      const res = this.individualResults[n.id];
      if (res && res.isCorrect) correctCount++;
    });

    const isPerfect = correctCount === totalCount;

    const modal = document.getElementById('quiz-completion-modal');
    const header = document.getElementById('quiz-modal-header');
    const icon = document.getElementById('quiz-modal-icon');
    const title = document.getElementById('quiz-modal-title');
    const subtitle = document.getElementById('quiz-modal-subtitle');
    const scoreNum = document.getElementById('quiz-modal-score-num');
    const totalNum = document.getElementById('quiz-modal-total-num');
    const desc = document.getElementById('quiz-modal-desc');

    if (scoreNum) scoreNum.textContent = correctCount;
    if (totalNum) totalNum.textContent = totalCount;

    if (isPerfect) {
      if (header) header.className = 'quiz-modal-header success';
      if (icon) icon.className = 'fa-solid fa-trophy';
      if (title) title.textContent = '🏆 만점 달성! 축하합니다!';
      if (subtitle) subtitle.textContent = '가계도의 모든 인물 유전자형을 완벽하게 맞추셨습니다!';
      if (desc) desc.textContent = '축하합니다! 멘델과 성염색체 유전 법칙을 명확하게 파악하고 계시네요. 팝업 우측 상단 [X] 버튼이나 아래 버튼을 눌러 가계도 해설을 확인하시고, 새로운 문제에 도전해 보세요!';
      this.triggerFireworks();
    } else {
      if (header) header.className = 'quiz-modal-header warning';
      if (icon) icon.className = 'fa-solid fa-lightbulb';
      if (title) title.textContent = '💡 아쉽습니다! 다시 도전해보세요';
      if (subtitle) subtitle.textContent = '가계도 캔버스에 붉은색 오답 강조 테두리와 정답이 표시되었습니다.';
      if (desc) desc.textContent = '팝업 우측 상단 [X] 버튼 또는 아래 [닫기] 버튼을 눌러 모달을 닫은 후, 캔버스에서 붉은색 테두리 인물의 정답을 확인하고 다시 도전해 보세요!';
    }

    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  triggerFireworks() {
    const canvas = document.getElementById('quiz-confetti-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#3b82f6', '#facc15'];

    for (let i = 0; i < 140; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() * 260 - 130),
        y: canvas.height / 2 + (Math.random() * 140 - 70),
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.85) * 18,
        size: Math.random() * 9 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.25,
        opacity: 1,
        shape: Math.random() < 0.5 ? 'circle' : 'rect'
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = 0;

      particles.forEach(p => {
        if (p.opacity <= 0) return;
        alive++;

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.38;
        p.vx *= 0.98;
        p.rotation += p.vRot;
        p.opacity -= 0.007;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        }

        ctx.restore();
      });

      if (alive > 0) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    animate();
  }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  window.quizEngine = new GeneticsQuizEngine();
});
