const MapConfig = {
    SHEET_ID: '1xzpPpZh00DCC6zl0PhVx7uGab_6-9qkPhTHqcz5yuIE',
    GIDS: { HEADER: '1120810254', POINTS: '1290947643', LEGEND: '882261582' },
    MAP_CENTER: [37.196554, 126.911871],
    BOUNDS: [[36.886521, 126.557641], [37.403725, 127.272064]],
    DISTRICTS: {
        "화성시": { pos: [37.185, 126.915], color: "#4A90E2", fullName: "화성시 전체" },
        "동탄구": { pos: [37.188, 127.138], color: "#d49400", fullName: "화성시 동탄구", keywords: ['동탄'] },
        "병점구": { pos: [37.213, 127.032], color: "#2e6394", fullName: "화성시 병점구", keywords: ['병점', '진안', '화산', '반월'] },
        "효행구": { pos: [37.214, 126.925], color: "#5696bd", fullName: "화성시 효행구", keywords: ['봉담', '정남', '비봉', '매송', '기배'] },
        "만세구": { pos: [37.152, 126.832], color: "#a0bed5", fullName: "화성시 만세구", keywords: ['향남', '양감', '팔탄', '우정', '장안', '마도', '송산', '서신', '남양', '새솔'] },
        "오산시": { pos: [37.16361, 127.07229], color: "#e65c2e", fullName: "오산시" }
    }
};

const MapManager = {
    map: null,
    cluster: null,
    markers: [],
    boundaryGroup: L.layerGroup(),
    tooltipLayers: [],

    init() {
        this.map = L.map('map', { zoomControl: false, minZoom: 10, maxZoom: 18 });
        this.map.setView(MapConfig.MAP_CENTER, 11);
        this.map.setMaxBounds(MapConfig.BOUNDS);

        // 팝업이 가장 위에 오도록 전용 Pane 생성
        const topPane = this.map.createPane('topPane');
        topPane.style.zIndex = 1000; // 버튼(800)보다 높게 설정

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(this.map);

        this.boundaryGroup.addTo(this.map);

        this.cluster = L.markerClusterGroup({
            spiderfyOnMaxZoom: true,
            maxClusterRadius: 80,
            disableClusteringAtZoom: 14, 
            singleMarkerMode: false, 
            showCoverageOnHover: false,
            chunkedLoading: true,
            zoomToBoundsOnClick: true
        }).addTo(this.map);

        this.bindEvents();
    },

    getMarkerIcon(p, zoom) {
        if (zoom < 14) {
            return L.divIcon({
                className: 'marker-cluster marker-cluster-small',
                html: `<div><span>1</span></div>`,
                iconSize: [40, 40]
            });
        } else {
            const isKinder = p.name.includes('유치원');
            const html = `
                <div class="custom-combined-marker ${isKinder ? 'is-kinder' : 'is-school'}">
                    <div class="marker-label-box">${p.name}</div>
                    <div class="marker-symbol" style="color:${p.color}">${p.shape}</div>
                </div>`;
            return L.divIcon({ className: 'marker-container-icon', html, iconSize: [0,0] });
        }
    },

    bindEvents() {
        this.map.on('zoomend', () => {
            const zoom = this.map.getZoom();
            const isChecked = document.getElementById('toggle-boundary')?.checked;
            this.tooltipLayers.forEach(l => l.setOpacity((zoom >= 14 && isChecked) ? 1 : 0));
            document.querySelectorAll('.dist-stat-btn').forEach(btn => {
                btn.className = `dist-stat-btn zoom-lv-${zoom}`;
            });
            this.markers.forEach(m => {
                m.setIcon(this.getMarkerIcon(m.properties, zoom));
            });
        });
    },

    createMarker(lat, lng, p) {
        const marker = L.marker([lat, lng], {
            icon: this.getMarkerIcon(p, this.map.getZoom())
        }).bindPopup(this.makePopupHtml(p), { 
            className: 'custom-popup',
            pane: 'topPane', // 학교 개별 팝업도 최상단 레이어 사용
            autoPan: true,
            autoPanPadding: L.point(50, 50)
        });
        marker.properties = p;
        return marker;
    },

    makePopupHtml(p) {
    // 사진 2와 3을 참고하여 데이터 매칭
    // p.type: 구분(유치원 등), p.name: 학교명, p.adrs: 주소
    // p.stdnt_cnt: 학생 수, p.class_cnt: 학급 수, p.stdnt_per_cl: 학급당 학생 수
    // p.tchr_cnt: 교사 수, p.stdnt_per_tchr: 교사 1인당 학생 수
    
    return `
        <div class="popup-content">
            <div class="popup-category" style="color: #00a0e9; font-size: 13px; margin-bottom: 4px;">${p.type || ''}</div>
            <div class="popup-title" style="font-size: 18px; font-weight: bold; color: #000; margin-bottom: 4px;">${p.name || ''}</div>
            <div class="popup-adrs" style="font-size: 12px; color: #666; margin-bottom: 10px;">${p.adrs || ''}</div>
            <hr class="popup-hr" style="border: 0; border-top: 1px solid #eee; margin: 10px 0;">
            <ul class="popup-info-list" style="list-style: none; padding: 0; margin: 0; font-size: 14px; color: #333; line-height: 1.8;">
                <li><span class="label">• 학생 수</span> <span class="value">${Number(p.stdnt_cnt).toLocaleString()}</span></li>
                <li><span class="label">• 학급 수</span> <span class="value">${p.class_cnt || 0}</span></li>
                <li><span class="label">• 학급당 학생 수</span> <span class="value">${p.stdnt_per_cl || 0}</span></li>
                <li><span class="label">• 교사 수</span> <span class="value">${p.tchr_cnt || 0}</span></li>
                <li><span class="label">• 교사 1인당 학생 수</span> <span class="value">${p.stdnt_per_tchr || 0}</span></li>
            </ul>
            ${p.url ? `<div class="popup-footer" style="text-align: right; margin-top: 10px;">
                <a href="${p.url}" target="_blank" style="color: #666; text-decoration: none; font-size: 12px;">홈페이지 가기</a>
            </div>` : ''}
        </div>`;
},

    addDistrictButtons() {
        Object.entries(MapConfig.DISTRICTS).forEach(([shortName, conf]) => {
            if (!conf.pos) return;
            const icon = L.divIcon({
                className: 'district-stat-marker',
                html: `<div class="dist-stat-btn zoom-lv-${this.map.getZoom()}" style="border-left: 4px solid ${conf.color};">${shortName}</div>`,
                iconSize: [80, 32]
            });
            L.marker(conf.pos, { icon }) // 버튼은 기본 레이어 혹은 별도 pane 관리
             .addTo(this.map)
             .on('click', (e) => {
                 L.DomEvent.stopPropagation(e);
                 this.showDistrictStats(conf.fullName, conf.pos);
             });
        });
    },

    showDistrictStats(fullName, latlng) {
    let targets;
    if (fullName === "화성시 전체") {
        targets = this.markers.filter(m => (m.properties.adrs || '').includes('화성시'));
    } else if (fullName === "오산시") {
        targets = this.markers.filter(m => (m.properties.adrs || '').includes('오산시'));
    } else {
        const distKey = fullName.replace('화성시 ', '');
        const keywords = MapConfig.DISTRICTS[distKey]?.keywords || [];
        targets = this.markers.filter(m => keywords.some(k => (m.properties.adrs || '').includes(k)));
    }

    // 통계 데이터 합산 (학생 수, 교사 수, 학급 수)
    const stats = targets.reduce((acc, m) => {
        acc.s += (parseInt(m.properties.stdnt_cnt) || 0);
        acc.t += (parseInt(m.properties.tchr_cnt) || 0);
        acc.c += (parseInt(m.properties.class_cnt) || 0);
        return acc;
    }, { s: 0, t: 0, c: 0 });

    L.popup({ 
        className: 'custom-popup stat-popup',
        pane: 'topPane',
        autoPan: true,
        closeButton: true
    })
    .setLatLng(latlng)
    .setContent(`
        <div class="popup-content">
            <div class="popup-title" style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">${fullName} 통계</div>
            <hr class="popup-hr" style="border: 0; border-top: 1px solid #eee; margin: 8px 0;">
            <ul class="popup-info-list" style="list-style: none; padding: 0; margin: 0; font-size: 14px; line-height: 1.8;">
                <li><span class="label">• 학교 수:</span> <span class="value"><strong>${targets.length}</strong>개교</span></li>
                <li><span class="label">• 총 학생 수:</span> <span class="value"><strong>${stats.s.toLocaleString()}</strong>명</span></li>
                <li><span class="label">• 총 학급 수:</span> <span class="value"><strong>${stats.c.toLocaleString()}</strong>학급</span></li>
                <li><span class="label">• 총 교사 수:</span> <span class="value"><strong>${stats.t.toLocaleString()}</strong>명</span></li>
            </ul>
        </div>
    `).openOn(this.map);
    }
};

const App = {
    async init() {
        MapManager.init();
        UIManager.init();
        try {
            const [pointRows, legendRows] = await Promise.all([
                this.fetchJson(MapConfig.GIDS.POINTS),
                this.fetchJson(MapConfig.GIDS.LEGEND)
            ]);
            pointRows.forEach(row => {
                const c = row.c;
                if (!c || !c[1]?.v) return;
                const p = {
                    type: c[3]?.v, 
                    name: c[4]?.v, 
                    adrs: c[5]?.v,
                    stdnt_cnt: c[6]?.v, 
                    stdnt_per_cl: c[7]?.v, // 사진 2의 H열(index 7) 추가
                    tchr_cnt: c[8]?.v, 
                    stdnt_per_tchr: c[9]?.v,
                    shape: c[10]?.v || '⬤', 
                    color: c[11]?.v || '#333', 
                    url: c[13]?.v,
                    class_cnt: c[14]?.v // 사진 2의 O열(index 14)
                };
                const marker = MapManager.createMarker(c[1].v, c[2].v, p);
                MapManager.markers.push(marker);
                MapManager.cluster.addLayer(marker);
            });
            this.renderLegend(legendRows);
            this.loadBoundaries();
            MapManager.addDistrictButtons();
        } catch (err) { console.error("초기화 실패:", err); }
    },
    async fetchJson(gid) {
        const response = await fetch(`https://docs.google.com/spreadsheets/d/${MapConfig.SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`);
        const text = await response.text();
        return JSON.parse(text.substring(47).slice(0, -2)).table.rows;
    },
    renderLegend(rows) {
        const container = document.getElementById('legend');
        container.innerHTML = '';
        const allBtn = document.createElement('div');
        allBtn.className = 'legend-item all-view-btn';
        allBtn.innerHTML = `<span>⏪</span> 전체 보기`;
        allBtn.onclick = () => {
            MapManager.cluster.clearLayers();
            MapManager.markers.forEach(m => MapManager.cluster.addLayer(m));
        };
        container.appendChild(allBtn);
        rows.forEach(row => {
            const type = row.c[1]?.v;
            if (!type) return;
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `<span style="color:${row.c[3]?.v}">${row.c[2]?.v}</span> ${type}`;
            item.onclick = () => {
                MapManager.cluster.clearLayers();
                MapManager.markers.filter(m => m.properties.type === type).forEach(m => MapManager.cluster.addLayer(m));
            };
            container.appendChild(item);
        });
    },
    async loadBoundaries() {
        const res = await fetch('data/hwao.geojson');
        const data = await res.json();
        const seenNames = new Set();
        const filteredFeatures = data.features.filter(f => {
            const name = f.properties.adm_nm;
            if (seenNames.has(name)) return false;
            seenNames.add(name);
            return true;
        });
        data.features = filteredFeatures;

        L.geoJSON(data, {
            style: (f) => {
                const nm = f.properties.adm_nm || '';
                let color = MapConfig.DISTRICTS["오산시"].color;
                for (const [key, val] of Object.entries(MapConfig.DISTRICTS)) {
                    if (val.keywords?.some(k => nm.includes(k))) { color = val.color; break; }
                }
                return { fillColor: color, fillOpacity: 0.3, color: "#bbb", weight: 1 };
            },
            onEachFeature: (f, l) => {
                const center = turf.pointOnFeature(f).geometry.coordinates;
                const tooltip = L.tooltip({ permanent: true, className: 'boundary-label', direction: 'center', opacity: 0 })
                                 .setContent(f.properties.adm_nm).setLatLng([center[1], center[0]]);
                tooltip.addTo(MapManager.map);
                MapManager.tooltipLayers.push(tooltip);
            }
        }).addTo(MapManager.boundaryGroup);
    }
};

const UIManager = {
    init() {
        document.getElementById('toggle-boundary')?.addEventListener('change', (e) => {
            if (e.target.checked) {
                MapManager.map.addLayer(MapManager.boundaryGroup);
                if (MapManager.map.getZoom() >= 14) MapManager.tooltipLayers.forEach(l => l.setOpacity(1));
            } else {
                MapManager.map.removeLayer(MapManager.boundaryGroup);
                MapManager.tooltipLayers.forEach(l => l.setOpacity(0));
            }
        });
    }
};

window.addEventListener('DOMContentLoaded', () => App.init());
