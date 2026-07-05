let map;
let teachers = [];
let markers = {};
let searchMarker = null;

const statusColor = {
  "In Class": "green",
  "Free": "blue",
  "Absent": "red"
};

const userRole = localStorage.getItem("userRole") || "user";
const BACKEND_BASE = 'http://127.0.0.1:3001';

async function fetchBackendJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  const body = await response.text();
  if (!response.ok) {
    const message = body.startsWith('{') ? JSON.parse(body).message || body : body;
    throw new Error(`Backend returned ${response.status}: ${message}`);
  }
  try {
    return JSON.parse(body);
  } catch (e) {
    throw new Error(`Unexpected backend response. Please restart the backend server.`);
  }
}

// === Initialize Map ===
function initMap() {
  map = L.map("map").setView([29.7544, 79.4276], 18);

  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18,
    minZoom: 17,
    attribution: 'Tiles &copy; Esri'
  }).addTo(map);

  const btkitPolygon = [
    [29.75168828072643, 79.42557779472104],
    [29.75178693768446, 79.42887323931501],
    [29.753506371777863, 79.43189271070781],
    [29.756761940750085, 79.43179530840565],
    [29.75753706063291, 79.43135699804598],
    [29.758326267444936, 79.4294901205881],
    [29.7595805297926, 79.42707129673059],
    [29.759524158788615, 79.42406805901958],
    [29.75821352400955, 79.42228235009402],
    [29.756621009202824, 79.42218494775611],
    [29.755775415849754, 79.42328884051382],
    [29.753069469154365, 79.42533428890536]
  ];

  const outerBounds = [
    [-90, -180], [-90, 180], [90, 180], [90, -180]
  ];

  const bounds = L.latLngBounds(btkitPolygon);
  map.setMaxBounds(bounds);
  map.fitBounds(bounds);

  L.polygon([outerBounds, btkitPolygon], {
    color: 'black',
    fillColor: 'black',
    fillOpacity: 0.9,
    stroke: false,
    interactive: false
  }).addTo(map);

  addDepartmentLabels();
}

function addDepartmentLabels() {
  const departmentLabels = [
    { name: "CSE And Civil Department", location: [29.752615, 79.427533] },
    { name: "Mechanical and BioTech Department", location: [29.753008, 79.428038] },
    { name: "Electronics and Electrical Deptartment", location: [29.752582, 79.426934] },
    { name: "Applied Science Department", location: [29.752851, 79.426388] },
    { name: "Chemical Department", location: [29.755074, 79.426998] },
    { name: "Administration Department", location: [29.754164, 79.428074] },
    { name: "Canteen", location: [29.754640, 79.426104] },
    { name: "Central Library", location: [29.753686, 79.426412] },
    { name: "CCFC", location: [29.752867, 79.425908] },
    { name: "MPH", location: [29.753958, 79.426265] },
    { name: "Lecture Theatre", location: [29.754524, 79.427283] },
    { name: "New Boys Hostel", location: [29.758854, 79.426486] },
    { name: "Kailash Hostel", location: [29.759281, 79.425669] },
    { name: "Nanda Devi Hostel", location: [29.758687, 79.424993] },
    { name: "Gaumukh Hostel", location: [29.756480, 79.423734] },
    { name: "Aravali Hostel", location: [29.756767, 79.424555] },
    { name: "Vidyanchal Hostel", location: [29.757347, 79.422829] },
    { name: "Gangotri Hostel", location: [29.756003, 79.430324] },
    { name: "Yamnotri Hostel", location: [29.754642, 79.430576] },
    { name: "BTKIT Health Centre", location: [29.757069, 79.426980] }
  ];

  departmentLabels.forEach(dept => {
    L.marker(dept.location, {
      icon: L.divIcon({
        className: 'dept-label',
        html: `<span>${dept.name}</span>`,
        iconSize: [0, 0]
      })
    }).addTo(map);
  });
}

function getStatusColor(status) {
  const colors = {
    "In Class": "green",
    "Free": "blue",
    "Absent": "red"
  };
  return colors[status] || "gray";
}

function clearAllMarkers() {
  for (let key in markers) {
    map.removeLayer(markers[key]);
  }
  markers = {};
}

function fetchTeachers() {
  fetchBackendJson(`${BACKEND_BASE}/api/teachers`)
    .then(data => {
      teachers = data;
      if (userRole === "admin") {
        updateAllMarkers();
      }
    })
    .catch(err => console.error('Teacher fetch failed:', err.message));
}

function updateAllMarkers() {
  clearAllMarkers();
  teachers.forEach(teacher => {
    const marker = L.circleMarker(teacher.location, {
      radius: 8,
      color: getStatusColor(teacher.status),
      fillColor: getStatusColor(teacher.status),
      fillOpacity: 0.8
    }).addTo(map).bindPopup(
      `<b>${teacher.name}</b><br>Status: ${teacher.status}<br>Last Updated: ${teacher.last_updated}`
    );
    markers[teacher.id] = marker;
  });
}

function renderScheduleTable(schedulesData) {
  const scheduleTableContent = document.getElementById('scheduleTableContent');
  const rows = schedulesData.flatMap(schedule => {
    const teacher = teachers.find(t => t.id === schedule.id) || { name: schedule.id };
    return schedule.schedule.map(item => ({
      id: schedule.id,
      name: teacher.name,
      day: item.day,
      hour: item.hour,
      dept: item.dept
    }));
  });

  if (!rows.length) {
    scheduleTableContent.innerHTML = '<p class="text-slate-400">No schedule data available.</p>';
    return;
  }

  const tableRows = rows.map(row => `
    <tr class="border-t border-white/10 even:bg-slate-950/70">
      <td class="whitespace-nowrap px-3 py-2 text-sm text-slate-100">${row.id}</td>
      <td class="whitespace-nowrap px-3 py-2 text-sm text-slate-100">${row.name}</td>
      <td class="whitespace-nowrap px-3 py-2 text-sm text-slate-100">${row.day}</td>
      <td class="whitespace-nowrap px-3 py-2 text-sm text-slate-100">${row.hour}:00</td>
      <td class="whitespace-nowrap px-3 py-2 text-sm text-slate-100">${row.dept}</td>
    </tr>
  `).join('');

  scheduleTableContent.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="border-b border-white/10 text-slate-400">
            <th class="px-3 py-2">Teacher ID</th>
            <th class="px-3 py-2">Name</th>
            <th class="px-3 py-2">Day</th>
            <th class="px-3 py-2">Hour</th>
            <th class="px-3 py-2">Department</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
  `;
}

function showAllSchedules() {
  const schedulePanel = document.getElementById('scheduleTableContainer');
  const scheduleTableContent = document.getElementById('scheduleTableContent');
  const scheduleBtn = document.getElementById('showScheduleTableBtn');
  if (!schedulePanel || !scheduleBtn) return;

  const isVisible = !schedulePanel.classList.contains('hidden');
  schedulePanel.classList.toggle('hidden', isVisible);
  scheduleBtn.textContent = isVisible ? 'View All Teacher Schedules' : 'Hide Schedule Table';

  if (isVisible) {
    return;
  }

  scheduleTableContent.innerHTML = '<p class="text-slate-400">Loading schedules...</p>';

  fetchBackendJson(`${BACKEND_BASE}/api/schedules`)
    .then(renderScheduleTable)
    .catch(err => {
      scheduleTableContent.innerHTML = `<span style="color:#f87171;">${err.message}</span>`;
    });
}

function searchTeacher() {
  const input = document.getElementById("searchInput").value.trim().toUpperCase();
  const resultDiv = document.getElementById("searchResult");

  resultDiv.innerHTML = 'Searching...';

  fetchBackendJson(`${BACKEND_BASE}/api/teachers/search?id=${encodeURIComponent(input)}`)
    .then(teacher => {
      resultDiv.innerHTML = `
        <div class="result-card-title"><strong>${teacher.name}</strong> (${teacher.id})</div>
        <div><strong>Status:</strong> ${teacher.status}</div>
        <div><strong>Location:</strong> ${teacher.departmentDescription}</div>
        <div><strong>Last Updated:</strong> ${teacher.last_updated}</div>
        <div class="mt-4 rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-slate-300">Schedule details will appear here soon.</div>
      `;

      if (searchMarker) {
        map.removeLayer(searchMarker);
        searchMarker = null;
      }

      if (userRole === 'admin') {
        const existing = markers[teacher.id];
        if (existing) {
          existing.openPopup();
          map.setView(teacher.location, 18);
          return;
        }
      }

      searchMarker = L.circleMarker(teacher.location, {
        radius: 8,
        color: getStatusColor(teacher.status),
        fillColor: getStatusColor(teacher.status),
        fillOpacity: 0.8
      }).addTo(map).bindPopup(
        `<b>${teacher.name}</b><br>Status: ${teacher.status}`
      ).openPopup();

      map.setView(teacher.location, 18);
    })
    .catch(err => {
      resultDiv.innerHTML = `<span style="color:#b91c1c;">${err.message}</span>`;
      if (searchMarker) {
        map.removeLayer(searchMarker);
        searchMarker = null;
      }
    });
}

function logout() {
  localStorage.removeItem('userRole');
  window.location.href = 'login.html';
}

// Run on page load
window.addEventListener("DOMContentLoaded", () => {
  initMap();
  fetchTeachers();
  setInterval(fetchTeachers, 5000);

  const roleDisplay = document.getElementById('userRoleDisplay');
  if (roleDisplay) {
    roleDisplay.textContent = userRole === 'admin' ? 'Admin' : 'User';
  }

  const scheduleBtn = document.getElementById('showScheduleTableBtn');
  if (scheduleBtn) {
    scheduleBtn.addEventListener('click', showAllSchedules);
    const isAdmin = userRole === 'admin';
    scheduleBtn.classList.toggle('hidden', !isAdmin);
    scheduleBtn.disabled = !isAdmin;
  }
});
