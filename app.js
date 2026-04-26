const APP = {
  state: {
    session: null,
    metadata: null,
    aircraft: [],
    snags: [],
    currentAircraftId: null,
    installGuidanceDismissed: false,
    annotation: {
      mediaId: null,
      image: null,
      tool: "arrow",
      active: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      shapes: []
    },
    pendingNewSnagMedia: [],
    camera: {
      stream: null,
      mode: "photo",
      targetSnagId: null,
      recorder: null,
      recordedChunks: []
    }
  },

  el: {},

  async init() {
    this.captureElements();
    this.bindEvents();
    await SnagDB.init();
    await this.seedInitialData();
    await this.loadSession();
    await this.refreshAircraft();
    this.loadInstallGuidanceState();
    this.updateNetworkBadge();
    this.updateInstallGuidance();
    this.showOfflineReadyBanner("Initializing offline mode...");
    this.setupServiceWorker();

    if (this.state.session) {
      this.route("dashboard");
    } else {
      this.route("login");
    }
  },

  captureElements() {
    this.el.banner = document.getElementById("globalBanner");
    this.el.views = document.querySelectorAll("[data-view]");
    this.el.loginForm = document.getElementById("loginForm");
    this.el.welcomeText = document.getElementById("welcomeText");
    this.el.logoutBtn = document.getElementById("logoutBtn");
    this.el.installGuidance = document.getElementById("installGuidance");
    this.el.installGuidanceTitle = document.getElementById("installGuidanceTitle");
    this.el.installGuidanceText = document.getElementById("installGuidanceText");
    this.el.installGuidanceSteps = document.getElementById("installGuidanceSteps");
    this.el.dismissInstallGuidanceBtn = document.getElementById("dismissInstallGuidanceBtn");

    this.el.aircraftList = document.getElementById("aircraftList");
    this.el.createAircraftBtn = document.getElementById("createAircraftBtn");
    this.el.exportDataBtn = document.getElementById("exportDataBtn");
    this.el.importDataBtn = document.getElementById("importDataBtn");
    this.el.importDataInput = document.getElementById("importDataInput");

    this.el.contextForm = document.getElementById("contextForm");
    this.el.contextBackBtn = document.getElementById("contextBackBtn");
    this.el.platformSelect = document.getElementById("platformSelect");
    this.el.aircraftNumberInput = document.getElementById("aircraftNumberInput");
    this.el.aircraftNumberOptions = document.getElementById("aircraftNumberOptions");
    this.el.milestoneSelect = document.getElementById("milestoneSelect");
    this.el.areaSelect = document.getElementById("areaSelect");
    this.el.zoneSelect = document.getElementById("zoneSelect");

    this.el.aircraftTitle = document.getElementById("aircraftTitle");
    this.el.aircraftContextSummary = document.getElementById("aircraftContextSummary");
    this.el.aircraftBackBtn = document.getElementById("aircraftBackBtn");
    this.el.snagForm = document.getElementById("snagForm");
    this.el.snagDescription = document.getElementById("snagDescription");
    this.el.snagLocation = document.getElementById("snagLocation");
    this.el.departmentSelect = document.getElementById("departmentSelect");
    this.el.submitSnagsBtn = document.getElementById("submitSnagsBtn");
    this.el.snagList = document.getElementById("snagList");
    this.el.snagTemplate = document.getElementById("snagTemplate");
    this.el.createSnagView = document.getElementById("createSnagView");
    this.el.reviewSnagView = document.getElementById("reviewSnagView");
    this.el.openCreateSnagViewBtn = document.getElementById("openCreateSnagViewBtn");
    this.el.openReviewSnagsViewBtn = document.getElementById("openReviewSnagsViewBtn");
    this.el.goToReviewFromCreateBtn = document.getElementById("goToReviewFromCreateBtn");
    this.el.goToCreateFromReviewBtn = document.getElementById("goToCreateFromReviewBtn");
    this.el.newSnagCapturePhotoBtn = document.getElementById("newSnagCapturePhotoBtn");
    this.el.newSnagCaptureVideoBtn = document.getElementById("newSnagCaptureVideoBtn");
    this.el.newSnagMediaPreview = document.getElementById("newSnagMediaPreview");

    this.el.filterZone = document.getElementById("filterZone");
    this.el.filterMilestone = document.getElementById("filterMilestone");
    this.el.filterDepartment = document.getElementById("filterDepartment");

    this.el.offlineIndicator = document.getElementById("offlineIndicator");
    this.el.onlineIndicator = document.getElementById("onlineIndicator");

    this.el.annotationModal = document.getElementById("annotationModal");
    this.el.annotationCanvas = document.getElementById("annotationCanvas");
    this.el.closeAnnotationBtn = document.getElementById("closeAnnotationBtn");
    this.el.saveAnnotationBtn = document.getElementById("saveAnnotationBtn");
    this.el.annotationTools = document.querySelectorAll(".annotation-tool");
    this.el.annotationTextInput = document.getElementById("annotationTextInput");
    this.annotationCtx = this.el.annotationCanvas.getContext("2d");

    this.el.cameraModal = document.getElementById("cameraModal");
    this.el.cameraVideo = document.getElementById("cameraVideo");
    this.el.closeCameraBtn = document.getElementById("closeCameraBtn");
    this.el.takePhotoBtn = document.getElementById("takePhotoBtn");
    this.el.startVideoRecordBtn = document.getElementById("startVideoRecordBtn");
    this.el.stopVideoRecordBtn = document.getElementById("stopVideoRecordBtn");
  },

  bindEvents() {
    this.el.loginForm.addEventListener("submit", (event) => this.login(event));
    this.el.logoutBtn.addEventListener("click", () => this.logout());
    this.el.createAircraftBtn.addEventListener("click", () => this.openContextForm());
    this.el.exportDataBtn.addEventListener("click", () => this.exportData());
    this.el.importDataBtn.addEventListener("click", () => this.el.importDataInput.click());
    this.el.importDataInput.addEventListener("change", (event) => this.importData(event));
    this.el.dismissInstallGuidanceBtn.addEventListener("click", () => this.dismissInstallGuidance());
    this.el.contextBackBtn.addEventListener("click", () => this.route("dashboard"));
    this.el.contextForm.addEventListener("submit", (event) => this.saveAircraftContext(event));

    this.el.aircraftBackBtn.addEventListener("click", () => this.route("dashboard"));
    this.el.snagForm.addEventListener("submit", (event) => this.createSnag(event));
    this.el.submitSnagsBtn.addEventListener("click", () => this.submitAircraftSnags());
    this.el.openCreateSnagViewBtn.addEventListener("click", () => this.showAircraftSubview("create"));
    this.el.openReviewSnagsViewBtn.addEventListener("click", () => this.showAircraftSubview("review"));
    this.el.goToReviewFromCreateBtn.addEventListener("click", () => this.showAircraftSubview("review"));
    this.el.goToCreateFromReviewBtn.addEventListener("click", () => this.showAircraftSubview("create"));
    this.el.newSnagCapturePhotoBtn.addEventListener("click", () => this.openCameraCapture("photo", null));
    this.el.newSnagCaptureVideoBtn.addEventListener("click", () => this.openCameraCapture("video", null));

    this.el.filterZone.addEventListener("change", () => this.renderSnags());
    this.el.filterMilestone.addEventListener("change", () => this.renderSnags());
    this.el.filterDepartment.addEventListener("change", () => this.renderSnags());

    window.addEventListener("online", () => this.updateNetworkBadge());
    window.addEventListener("offline", () => this.updateNetworkBadge());
    window.addEventListener("appinstalled", () => {
      this.state.installGuidanceDismissed = false;
      localStorage.setItem("burke-install-guidance-dismissed", "0");
      this.updateInstallGuidance();
    });

    this.el.closeAnnotationBtn.addEventListener("click", () => this.closeAnnotationEditor());
    this.el.saveAnnotationBtn.addEventListener("click", () => this.saveAnnotation());
    this.el.annotationTools.forEach((toolBtn) => {
      toolBtn.addEventListener("click", () => this.setAnnotationTool(toolBtn.dataset.tool));
    });

    this.el.annotationCanvas.addEventListener("pointerdown", (event) => this.onAnnotationPointerDown(event));
    this.el.annotationCanvas.addEventListener("pointermove", (event) => this.onAnnotationPointerMove(event));
    this.el.annotationCanvas.addEventListener("pointerup", (event) => this.onAnnotationPointerUp(event));
    this.el.annotationCanvas.addEventListener("pointerleave", (event) => this.onAnnotationPointerUp(event));

    this.el.closeCameraBtn.addEventListener("click", () => this.closeCameraCapture());
    this.el.takePhotoBtn.addEventListener("click", () => this.takePhoto());
    this.el.startVideoRecordBtn.addEventListener("click", () => this.startVideoRecording());
    this.el.stopVideoRecordBtn.addEventListener("click", () => this.stopVideoRecording());
  },

  route(name) {
    this.el.views.forEach((view) => {
      view.classList.toggle("active", view.id === `view-${name}`);
    });

    if (name === "dashboard") {
      this.renderDashboard();
    }

    if (name === "context") {
      this.populateContextForm();
    }

    if (name === "aircraft") {
      this.renderAircraftWorkspace();
    }
  },

  async seedInitialData() {
    const metadata = await SnagDB.get(DB_STORE.metadata, "catalog");

    if (!metadata) {
      await SnagDB.put(DB_STORE.metadata, {
        key: "catalog",
        value: {
          platforms: ["Global", "Challenger"],
          milestones: ["PreTTC", "TTC", "RD2", "RD3", "Interior Install"],
          areas: ["Interior", "Exterior"],
          zones: {
            Interior: ["Cabin Zone 1", "Cabin Zone 2", "Galley", "Lav"],
            Exterior: ["Wing", "Tail", "Nose", "Fuselage"]
          },
          departments: [
            "Interior Technician",
            "Avionics",
            "Structures",
            "Electrical",
            "Quality",
            "Delivery Coordinator"
          ]
        }
      });
    }

    this.state.metadata = (await SnagDB.get(DB_STORE.metadata, "catalog")).value;

    const existingAircraft = await SnagDB.getAll(DB_STORE.aircraft);
    if (!existingAircraft.length) {
      const seedAircraft = {
        id: this.uuid(),
        platform: "Global",
        aircraftNumber: "70250",
        milestone: "TTC",
        area: "Interior",
        zone: "Cabin Zone 1",
        contextLocked: true,
        createdAt: new Date().toISOString()
      };

      await SnagDB.put(DB_STORE.aircraft, seedAircraft);
      await SnagDB.put(DB_STORE.snags, {
        id: this.uuid(),
        localId: "LOC-TTC-70250-001",
        aircraftId: seedAircraft.id,
        aircraftNumber: "70250",
        milestone: "TTC",
        area: "Interior",
        zone: "Cabin Zone 1",
        description: "Seat trim misalignment near row 2",
        location: "Cabin wall panel A2",
        department: "Interior Technician",
        status: "LOC",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  },

  async loadSession() {
    const raw = localStorage.getItem("burke-session");
    this.state.session = raw ? JSON.parse(raw) : null;
  },

  loadInstallGuidanceState() {
    this.state.installGuidanceDismissed = localStorage.getItem("burke-install-guidance-dismissed") === "1";
  },

  dismissInstallGuidance() {
    this.state.installGuidanceDismissed = true;
    localStorage.setItem("burke-install-guidance-dismissed", "1");
    this.el.installGuidance.classList.add("hidden");
  },

  updateInstallGuidance() {
    if (this.state.installGuidanceDismissed) {
      this.el.installGuidance.classList.add("hidden");
      return;
    }

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

    if (isIos && !isStandalone) {
      this.el.installGuidanceTitle.textContent = "Install on iPhone/iPad";
      this.el.installGuidanceText.textContent = "For best launch behavior and offline reliability, install this app from Safari.";
      this.el.installGuidanceSteps.innerHTML = [
        "Open this page in Safari (not in-app browser).",
        "Tap Share, then tap Add to Home Screen.",
        "Launch the app from the new home screen icon for fullscreen behavior."
      ].map((step) => `<li>${step}</li>`).join("");
      this.el.installGuidance.classList.remove("hidden");
      return;
    }

    if (isStandalone) {
      this.el.installGuidanceTitle.textContent = "Launch Hint";
      this.el.installGuidanceText.textContent = "This app is installed. Keep launching from the home screen icon for the most stable offline experience.";
      this.el.installGuidanceSteps.innerHTML = [
        "Open the app from its installed icon.",
        "Avoid opening inside browser tabs.",
        "If UI looks stale, close and relaunch the installed app once."
      ].map((step) => `<li>${step}</li>`).join("");
      this.el.installGuidance.classList.remove("hidden");
      return;
    }

    this.el.installGuidance.classList.add("hidden");
  },

  async login(event) {
    event.preventDefault();

    this.state.session = { authenticated: true, signedInAt: new Date().toISOString() };
    localStorage.setItem("burke-session", JSON.stringify(this.state.session));
    this.route("dashboard");
  },

  logout() {
    localStorage.removeItem("burke-session");
    this.state.session = null;
    this.state.currentAircraftId = null;
    this.route("login");
  },

  async refreshAircraft() {
    this.state.aircraft = await SnagDB.getAll(DB_STORE.aircraft);
    this.state.snags = await SnagDB.getAll(DB_STORE.snags);
  },

  renderDashboard() {
    this.el.welcomeText.textContent = this.state.session ? "SSO Authenticated" : "";

    const cards = this.state.aircraft
      .sort((a, b) => a.aircraftNumber.localeCompare(b.aircraftNumber))
      .map((aircraft) => {
        const snagCount = this.state.snags.filter((snag) => snag.aircraftId === aircraft.id).length;
        return `
          <article class="aircraft-card">
            <h3>Aircraft ${aircraft.aircraftNumber}</h3>
            <p><strong>Milestone:</strong> ${aircraft.milestone}</p>
            <p><strong>Snags:</strong> ${snagCount}</p>
            <p><span class="loc-chip">LOC</span></p>
            <button class="btn btn-light open-aircraft" type="button" data-aircraft-id="${aircraft.id}">Open</button>
          </article>
        `;
      })
      .join("");

    this.el.aircraftList.innerHTML = cards || '<div class="empty-state">No aircraft yet. Create one to begin.</div>';

    this.el.aircraftList.querySelectorAll(".open-aircraft").forEach((button) => {
      button.addEventListener("click", () => {
        this.state.currentAircraftId = button.dataset.aircraftId;
        this.route("aircraft");
      });
    });
  },

  openContextForm() {
    this.state.currentAircraftId = null;
    this.el.contextForm.reset();
    this.route("context");
  },

  populateContextForm() {
    this.populateSelect(this.el.platformSelect, this.state.metadata.platforms);
    this.populateSelect(this.el.milestoneSelect, this.state.metadata.milestones);
    this.populateSelect(this.el.areaSelect, this.state.metadata.areas);
    this.populateSelect(this.el.departmentSelect, this.state.metadata.departments, "Interior Technician");

    this.populateFilters();

    const allAircraftNumbers = this.state.aircraft.map((a) => a.aircraftNumber);
    this.el.aircraftNumberOptions.innerHTML = allAircraftNumbers
      .map((n) => `<option value="${this.escape(n)}"></option>`)
      .join("");

    this.el.areaSelect.onchange = () => this.populateZoneByArea();
    this.populateZoneByArea();
  },

  populateSelect(selectElement, options, selected = "") {
    selectElement.innerHTML = options
      .map((option) => `<option value="${this.escape(option)}" ${option === selected ? "selected" : ""}>${option}</option>`)
      .join("");
  },

  populateZoneByArea() {
    const area = this.el.areaSelect.value || "Interior";
    const zones = this.state.metadata.zones[area] || [];
    this.populateSelect(this.el.zoneSelect, zones);
  },

  populateFilters() {
    const withAll = (items) => ["All", ...items];
    this.populateSelect(this.el.filterZone, withAll(this.state.metadata.zones.Interior.concat(this.state.metadata.zones.Exterior)), "All");
    this.populateSelect(this.el.filterMilestone, withAll(this.state.metadata.milestones), "All");
    this.populateSelect(this.el.filterDepartment, withAll(this.state.metadata.departments), "All");
  },

  async saveAircraftContext(event) {
    event.preventDefault();

    const payload = {
      platform: this.el.platformSelect.value,
      aircraftNumber: this.el.aircraftNumberInput.value.trim(),
      milestone: this.el.milestoneSelect.value,
      area: this.el.areaSelect.value,
      zone: this.el.zoneSelect.value
    };

    if (!payload.aircraftNumber) return;

    const existing = this.state.aircraft.find((a) => a.aircraftNumber === payload.aircraftNumber);
    let aircraft;

    if (existing) {
      aircraft = existing;
      // Keep previously saved context immutable after first save.
      if (!existing.contextLocked) {
        aircraft = { ...existing, ...payload, contextLocked: true, updatedAt: new Date().toISOString() };
        await SnagDB.put(DB_STORE.aircraft, aircraft);
      }
    } else {
      aircraft = {
        id: this.uuid(),
        ...payload,
        contextLocked: true,
        createdAt: new Date().toISOString()
      };
      await SnagDB.put(DB_STORE.aircraft, aircraft);
    }

    await this.refreshAircraft();
    this.state.currentAircraftId = aircraft.id;
    this.route("aircraft");
  },

  currentAircraft() {
    return this.state.aircraft.find((a) => a.id === this.state.currentAircraftId) || null;
  },

  async renderAircraftWorkspace() {
    await this.refreshAircraft();
    const aircraft = this.currentAircraft();
    if (!aircraft) {
      this.route("dashboard");
      return;
    }

    this.el.aircraftTitle.textContent = `Aircraft ${aircraft.aircraftNumber}`;
    this.el.aircraftContextSummary.textContent = `${aircraft.platform} / ${aircraft.milestone} / ${aircraft.area} / ${aircraft.zone} (Context Locked)`;

    this.populateSelect(this.el.departmentSelect, this.state.metadata.departments, "Interior Technician");
    this.populateFilters();
    this.renderPendingNewSnagMedia();
    await this.renderSnags();
    this.showAircraftSubview("create");
  },

  showAircraftSubview(name) {
    const isCreate = name === "create";
    this.el.createSnagView.classList.toggle("hidden", !isCreate);
    this.el.reviewSnagView.classList.toggle("hidden", isCreate);
    this.el.createSnagView.classList.toggle("active-subview", isCreate);
    this.el.reviewSnagView.classList.toggle("active-subview", !isCreate);
    this.el.openCreateSnagViewBtn.classList.toggle("btn-primary", isCreate);
    this.el.openCreateSnagViewBtn.classList.toggle("btn-light", !isCreate);
    this.el.openReviewSnagsViewBtn.classList.toggle("btn-primary", !isCreate);
    this.el.openReviewSnagsViewBtn.classList.toggle("btn-light", isCreate);
  },

  async createSnag(event) {
    event.preventDefault();

    const aircraft = this.currentAircraft();
    if (!aircraft) return;

    const description = this.el.snagDescription.value.trim();
    const location = this.el.snagLocation.value.trim();
    const department = this.el.departmentSelect.value;

    if (!description || !location || !department) return;

    const existingForAircraft = this.state.snags.filter((s) => s.aircraftId === aircraft.id);
    const sequence = String(existingForAircraft.length + 1).padStart(3, "0");
    const localId = `LOC-${aircraft.milestone}-${aircraft.aircraftNumber}-${sequence}`;

    const snagId = this.uuid();

    await SnagDB.put(DB_STORE.snags, {
      id: snagId,
      localId,
      aircraftId: aircraft.id,
      aircraftNumber: aircraft.aircraftNumber,
      milestone: aircraft.milestone,
      area: aircraft.area,
      zone: aircraft.zone,
      description,
      location,
      department,
      status: "LOC",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    if (this.state.pendingNewSnagMedia.length) {
      const mediaToSave = this.state.pendingNewSnagMedia.map((media) => ({
        ...media,
        id: this.uuid(),
        snagId,
        createdAt: new Date().toISOString()
      }));
      await SnagDB.bulkPut(DB_STORE.media, mediaToSave);
    }

    this.state.pendingNewSnagMedia = [];
    this.renderPendingNewSnagMedia();

    this.el.snagForm.reset();
    this.populateSelect(this.el.departmentSelect, this.state.metadata.departments, "Interior Technician");
    await this.refreshAircraft();
    await this.renderSnags();
  },

  async renderSnags() {
    const aircraft = this.currentAircraft();
    if (!aircraft) return;

    const zoneFilter = this.el.filterZone.value || "All";
    const milestoneFilter = this.el.filterMilestone.value || "All";
    const departmentFilter = this.el.filterDepartment.value || "All";

    const filtered = this.state.snags
      .filter((snag) => snag.aircraftId === aircraft.id)
      .filter((snag) => zoneFilter === "All" || snag.zone === zoneFilter)
      .filter((snag) => milestoneFilter === "All" || snag.milestone === milestoneFilter)
      .filter((snag) => departmentFilter === "All" || snag.department === departmentFilter)
      .sort((a, b) => a.localId.localeCompare(b.localId));

    if (!filtered.length) {
      this.el.snagList.innerHTML = '<div class="empty-state">No snags match the filters.</div>';
      return;
    }

    this.el.snagList.innerHTML = "";

    for (const snag of filtered) {
      const fragment = this.el.snagTemplate.content.cloneNode(true);
      const card = fragment.querySelector(".snag-card");
      const idEl = fragment.querySelector(".snag-id");
      const metaEl = fragment.querySelector(".snag-meta");
      const statusBadge = fragment.querySelector(".status-badge");
      const descEl = fragment.querySelector(".edit-description");
      const locEl = fragment.querySelector(".edit-location");
      const depEl = fragment.querySelector(".edit-department");
      const saveBtn = fragment.querySelector(".save-snag");
      const capturePhotoBtn = fragment.querySelector(".capture-photo-btn");
      const captureVideoBtn = fragment.querySelector(".capture-video-btn");
      const mediaPreview = fragment.querySelector(".media-preview");

      idEl.textContent = snag.localId;
      metaEl.textContent = `${snag.zone} | ${snag.department}`;
      statusBadge.textContent = snag.status;
      statusBadge.classList.add(snag.status === "UPL" ? "status-upl" : "status-loc");
      descEl.value = snag.description;
      locEl.value = snag.location;
      this.populateSelect(depEl, this.state.metadata.departments, snag.department);

      const media = await SnagDB.getByIndex(DB_STORE.media, "bySnagId", snag.id);
      this.renderMediaPreview(mediaPreview, media);

      saveBtn.addEventListener("click", async () => {
        snag.description = descEl.value.trim();
        snag.location = locEl.value.trim();
        snag.department = depEl.value;
        snag.updatedAt = new Date().toISOString();
        await SnagDB.put(DB_STORE.snags, snag);
        await this.refreshAircraft();
        await this.renderSnags();
      });

      capturePhotoBtn.addEventListener("click", () => this.openCameraCapture("photo", snag.id));
      captureVideoBtn.addEventListener("click", () => this.openCameraCapture("video", snag.id));

      card.dataset.snagId = snag.id;
      this.el.snagList.appendChild(fragment);
    }
  },

  renderMediaPreview(container, mediaList) {
    container.innerHTML = "";

    if (!mediaList.length) {
      container.innerHTML = '<p class="muted">No media attached.</p>';
      return;
    }

    mediaList.forEach((media) => {
      const item = document.createElement("div");
      item.className = "media-item";

      const url = URL.createObjectURL(media.blob);
      if (media.type.startsWith("image/")) {
        const img = document.createElement("img");
        img.src = url;
        img.alt = media.name || "Attached image";
        item.appendChild(img);

        const annotateBtn = document.createElement("button");
        annotateBtn.className = "btn btn-light";
        annotateBtn.type = "button";
        annotateBtn.textContent = "Annotate";
        annotateBtn.addEventListener("click", () => this.openAnnotationEditor(media));
        item.appendChild(annotateBtn);
      } else if (media.type.startsWith("video/")) {
        const video = document.createElement("video");
        video.src = url;
        video.controls = true;
        item.appendChild(video);
      } else {
        const p = document.createElement("p");
        p.textContent = media.name || "Attached file";
        item.appendChild(p);
      }

      if (Array.isArray(media.annotations) && media.annotations.length) {
        const caption = document.createElement("p");
        caption.className = "media-caption";
        caption.textContent = `Annotations: ${media.annotations.length}`;
        item.appendChild(caption);
      }

      container.appendChild(item);
    });
  },

  setAnnotationTool(tool) {
    this.state.annotation.tool = tool;
    this.el.annotationTools.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.tool === tool);
    });
  },

  async openAnnotationEditor(media) {
    if (!media?.blob || !media.type.startsWith("image/")) return;

    this.state.annotation.mediaId = media.id;
    this.state.annotation.shapes = Array.isArray(media.annotations) ? [...media.annotations] : [];
    this.state.annotation.active = false;
    this.setAnnotationTool("arrow");
    this.el.annotationTextInput.value = "";

    const dataUrl = await this.blobToDataUrl(media.blob);
    const img = new Image();
    img.onload = () => {
      this.state.annotation.image = img;
      const ratio = img.width / img.height;
      const targetWidth = Math.min(1100, img.width);
      const targetHeight = Math.round(targetWidth / ratio);
      this.el.annotationCanvas.width = targetWidth;
      this.el.annotationCanvas.height = targetHeight;
      this.redrawAnnotationCanvas();
      this.el.annotationModal.classList.remove("hidden");
    };
    img.src = dataUrl;
  },

  closeAnnotationEditor() {
    this.el.annotationModal.classList.add("hidden");
  },

  getCanvasPoint(event) {
    const rect = this.el.annotationCanvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * this.el.annotationCanvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * this.el.annotationCanvas.height;
    return { x, y };
  },

  onAnnotationPointerDown(event) {
    if (this.el.annotationModal.classList.contains("hidden")) return;
    const point = this.getCanvasPoint(event);

    if (this.state.annotation.tool === "text") {
      const text = this.el.annotationTextInput.value.trim();
      if (!text) return;

      this.state.annotation.shapes.push({
        type: "text",
        x: point.x,
        y: point.y,
        text
      });
      this.redrawAnnotationCanvas();
      return;
    }

    this.state.annotation.active = true;
    this.state.annotation.startX = point.x;
    this.state.annotation.startY = point.y;
    this.state.annotation.currentX = point.x;
    this.state.annotation.currentY = point.y;
  },

  onAnnotationPointerMove(event) {
    if (!this.state.annotation.active) return;
    const point = this.getCanvasPoint(event);
    this.state.annotation.currentX = point.x;
    this.state.annotation.currentY = point.y;
    this.redrawAnnotationCanvas(true);
  },

  onAnnotationPointerUp(event) {
    if (!this.state.annotation.active) return;
    const point = this.getCanvasPoint(event);
    this.state.annotation.currentX = point.x;
    this.state.annotation.currentY = point.y;

    this.state.annotation.shapes.push({
      type: this.state.annotation.tool,
      x1: this.state.annotation.startX,
      y1: this.state.annotation.startY,
      x2: this.state.annotation.currentX,
      y2: this.state.annotation.currentY
    });
    this.state.annotation.active = false;
    this.redrawAnnotationCanvas();
  },

  redrawAnnotationCanvas(includePreview = false) {
    const ctx = this.annotationCtx;
    const canvas = this.el.annotationCanvas;
    const image = this.state.annotation.image;
    if (!ctx || !image) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    this.state.annotation.shapes.forEach((shape) => this.drawShape(shape));

    if (includePreview && this.state.annotation.active) {
      this.drawShape({
        type: this.state.annotation.tool,
        x1: this.state.annotation.startX,
        y1: this.state.annotation.startY,
        x2: this.state.annotation.currentX,
        y2: this.state.annotation.currentY
      }, true);
    }
  },

  drawShape(shape, isPreview = false) {
    const ctx = this.annotationCtx;
    ctx.save();
    ctx.strokeStyle = isPreview ? "#f7c948" : "#f4d35e";
    ctx.fillStyle = "#f4d35e";
    ctx.lineWidth = 4;
    ctx.font = "28px Segoe UI";

    if (shape.type === "arrow") {
      const { x1, y1, x2, y2 } = shape;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      const angle = Math.atan2(y2 - y1, x2 - x1);
      const head = 16;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    }

    if (shape.type === "circle") {
      const cx = (shape.x1 + shape.x2) / 2;
      const cy = (shape.y1 + shape.y2) / 2;
      const rx = Math.abs(shape.x2 - shape.x1) / 2;
      const ry = Math.abs(shape.y2 - shape.y1) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(10, rx), Math.max(10, ry), 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (shape.type === "text") {
      ctx.fillText(shape.text || "Label", shape.x, shape.y);
    }

    ctx.restore();
  },

  async saveAnnotation() {
    const mediaId = this.state.annotation.mediaId;
    if (!mediaId) return;

    const allMedia = await SnagDB.getAll(DB_STORE.media);
    const media = allMedia.find((item) => item.id === mediaId);
    if (!media) return;

    const blob = await new Promise((resolve) => {
      this.el.annotationCanvas.toBlob((value) => resolve(value), "image/png", 0.92);
    });

    const updated = {
      ...media,
      type: "image/png",
      blob,
      annotations: this.state.annotation.shapes,
      updatedAt: new Date().toISOString()
    };

    await SnagDB.put(DB_STORE.media, updated);
    this.closeAnnotationEditor();
    await this.renderSnags();
    this.showOfflineReadyBanner("Annotation saved");
  },

  renderPendingNewSnagMedia() {
    this.el.newSnagMediaPreview.innerHTML = "";

    if (!this.state.pendingNewSnagMedia.length) {
      this.el.newSnagMediaPreview.innerHTML = '<p class="muted">No media captured yet.</p>';
      return;
    }

    this.state.pendingNewSnagMedia.forEach((media, index) => {
      const item = document.createElement("div");
      item.className = "media-item";

      const url = URL.createObjectURL(media.blob);
      if ((media.type || "").startsWith("image/")) {
        const img = document.createElement("img");
        img.src = url;
        img.alt = media.name || "Captured image";
        item.appendChild(img);
      } else {
        const video = document.createElement("video");
        video.src = url;
        video.controls = true;
        item.appendChild(video);
      }

      const removeBtn = document.createElement("button");
      removeBtn.className = "btn btn-light";
      removeBtn.type = "button";
      removeBtn.textContent = "Remove";
      removeBtn.addEventListener("click", () => {
        this.state.pendingNewSnagMedia.splice(index, 1);
        this.renderPendingNewSnagMedia();
      });
      item.appendChild(removeBtn);

      this.el.newSnagMediaPreview.appendChild(item);
    });
  },

  async openCameraCapture(mode, targetSnagId) {
    this.state.camera.mode = mode;
    this.state.camera.targetSnagId = targetSnagId;

    if (!navigator.mediaDevices?.getUserMedia) {
      this.showOfflineReadyBanner("Camera API not available in this browser");
      return;
    }

    try {
      const constraints = mode === "video"
        ? { video: { facingMode: "environment" }, audio: true }
        : { video: { facingMode: "environment" }, audio: false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.state.camera.stream = stream;
      this.el.cameraVideo.srcObject = stream;
      await this.el.cameraVideo.play();

      this.el.takePhotoBtn.classList.toggle("hidden", mode !== "photo");
      this.el.startVideoRecordBtn.classList.toggle("hidden", mode !== "video");
      this.el.stopVideoRecordBtn.classList.add("hidden");
      this.el.cameraModal.classList.remove("hidden");
    } catch (error) {
      console.error(error);
      this.showOfflineReadyBanner("Unable to access camera/microphone");
    }
  },

  closeCameraCapture() {
    if (this.state.camera.recorder && this.state.camera.recorder.state === "recording") {
      this.state.camera.recorder.stop();
    }

    if (this.state.camera.stream) {
      this.state.camera.stream.getTracks().forEach((track) => track.stop());
      this.state.camera.stream = null;
    }

    this.el.cameraVideo.srcObject = null;
    this.el.cameraModal.classList.add("hidden");
    this.state.camera.recordedChunks = [];
    this.state.camera.recorder = null;
  },

  async takePhoto() {
    if (!this.state.camera.stream) return;
    const video = this.el.cameraVideo;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) => {
      canvas.toBlob((value) => resolve(value), "image/jpeg", 0.92);
    });

    if (!blob) return;
    await this.storeCapturedMedia(blob, "image/jpeg", `photo-${Date.now()}.jpg`);
    this.closeCameraCapture();
  },

  startVideoRecording() {
    if (!this.state.camera.stream) return;

    try {
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const recorder = new MediaRecorder(this.state.camera.stream, { mimeType });
      this.state.camera.recordedChunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.state.camera.recordedChunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(this.state.camera.recordedChunks, { type: recorder.mimeType || "video/webm" });
        if (blob.size > 0) {
          await this.storeCapturedMedia(blob, blob.type, `video-${Date.now()}.webm`);
        }
        this.closeCameraCapture();
      };

      recorder.start();
      this.state.camera.recorder = recorder;
      this.el.startVideoRecordBtn.classList.add("hidden");
      this.el.stopVideoRecordBtn.classList.remove("hidden");
      this.showOfflineReadyBanner("Recording started");
    } catch (error) {
      console.error(error);
      this.showOfflineReadyBanner("Video recording is not supported here");
    }
  },

  stopVideoRecording() {
    if (this.state.camera.recorder?.state === "recording") {
      this.state.camera.recorder.stop();
      this.showOfflineReadyBanner("Recording stopped");
    }
  },

  async storeCapturedMedia(blob, type, name) {
    if (this.state.camera.targetSnagId) {
      await SnagDB.put(DB_STORE.media, {
        id: this.uuid(),
        snagId: this.state.camera.targetSnagId,
        type,
        name,
        blob,
        createdAt: new Date().toISOString()
      });
      await this.renderSnags();
    } else {
      this.state.pendingNewSnagMedia.push({ type, name, blob, annotations: [] });
      this.renderPendingNewSnagMedia();
    }
  },

  async submitAircraftSnags() {
    const aircraft = this.currentAircraft();
    if (!aircraft) return;

    const snags = this.state.snags.filter((s) => s.aircraftId === aircraft.id);
    // Offline behavior: update status only in local storage, no network sync.
    const updates = snags.map((snag) => ({
      ...snag,
      status: "UPL",
      updatedAt: new Date().toISOString()
    }));

    await SnagDB.bulkPut(DB_STORE.snags, updates);
    await this.refreshAircraft();
    await this.renderSnags();
    this.showOfflineReadyBanner("Snags submitted successfully");
  },

  async exportData() {
    try {
      const [aircraft, snags, metadata, media] = await Promise.all([
        SnagDB.getAll(DB_STORE.aircraft),
        SnagDB.getAll(DB_STORE.snags),
        SnagDB.getAll(DB_STORE.metadata),
        SnagDB.getAll(DB_STORE.media)
      ]);

      const mediaSerialized = [];
      for (const item of media) {
        mediaSerialized.push({
          ...item,
          blob: undefined,
          dataUrl: item.blob ? await this.blobToDataUrl(item.blob) : null
        });
      }

      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        data: {
          aircraft,
          snags,
          metadata,
          media: mediaSerialized
        }
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const stamp = new Date().toISOString().replaceAll(":", "-").split(".")[0];
      anchor.href = url;
      anchor.download = `burke-export-${stamp}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      this.showOfflineReadyBanner("Data exported successfully");
    } catch (error) {
      console.error(error);
      this.showOfflineReadyBanner("Export failed. Try again.");
    }
  },

  async importData(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const data = parsed?.data;

      if (!data || !Array.isArray(data.aircraft) || !Array.isArray(data.snags) || !Array.isArray(data.metadata) || !Array.isArray(data.media)) {
        throw new Error("Invalid data format");
      }

      if (!data.metadata.some((entry) => entry.key === "catalog" && entry.value)) {
        throw new Error("Missing metadata catalog");
      }

      const mediaRecords = [];
      for (const item of data.media) {
        mediaRecords.push({
          ...item,
          blob: item.dataUrl ? await this.dataUrlToBlob(item.dataUrl) : new Blob([], { type: item.type || "application/octet-stream" }),
          dataUrl: undefined
        });
      }

      await Promise.all([
        SnagDB.clear(DB_STORE.aircraft),
        SnagDB.clear(DB_STORE.snags),
        SnagDB.clear(DB_STORE.metadata),
        SnagDB.clear(DB_STORE.media)
      ]);

      await Promise.all([
        SnagDB.bulkPut(DB_STORE.aircraft, data.aircraft),
        SnagDB.bulkPut(DB_STORE.snags, data.snags),
        SnagDB.bulkPut(DB_STORE.metadata, data.metadata),
        SnagDB.bulkPut(DB_STORE.media, mediaRecords)
      ]);

      this.state.metadata = (await SnagDB.get(DB_STORE.metadata, "catalog"))?.value || this.state.metadata;
      await this.refreshAircraft();
      this.state.currentAircraftId = null;
      this.route("dashboard");
      this.showOfflineReadyBanner("Data imported successfully");
    } catch (error) {
      console.error(error);
      this.showOfflineReadyBanner("Import failed. Check JSON format.");
    } finally {
      event.target.value = "";
    }
  },

  blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  },

  async dataUrlToBlob(dataUrl) {
    const response = await fetch(dataUrl);
    return response.blob();
  },

  showOfflineReadyBanner(message) {
    this.el.banner.textContent = message;
    this.el.banner.classList.remove("hidden");
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => this.el.banner.classList.add("hidden"), 3200);
  },

  updateNetworkBadge() {
    const online = navigator.onLine;
    this.el.offlineIndicator.classList.toggle("hidden", online);
    this.el.onlineIndicator.classList.toggle("hidden", !online);
    this.updateInstallGuidance();
  },

  async setupServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      this.showOfflineReadyBanner("Service worker is not available in this browser");
      return;
    }

    try {
      const reg = await navigator.serviceWorker.register("service-worker.js");
      if (reg.installing) {
        this.showOfflineReadyBanner("Preparing offline cache...");
      }

      await navigator.serviceWorker.ready;
      this.showOfflineReadyBanner("App ready to work offline");
    } catch (error) {
      this.showOfflineReadyBanner("Offline setup failed. Please reload.");
      console.error(error);
    }
  },

  uuid() {
    return crypto.randomUUID();
  },

  escape(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
};

window.addEventListener("DOMContentLoaded", () => APP.init());
