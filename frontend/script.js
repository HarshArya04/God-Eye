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
  fetch("http://localhost:3001/api/teachers")
    .then(res => res.json())
    .then(data => {
      teachers = data;
      if (userRole === "admin") {
        updateAllMarkers();
      }
    });
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

function searchTeacher() {
  const input = document.getElementById("searchInput").value.trim().toLowerCase();
  const resultDiv = document.getElementById("searchResult");

  fetch(`http://localhost:3001/api/teachers/search?q=${encodeURIComponent(input)}`)
    .then(res => {
      if (!res.ok) throw new Error("No matching teacher found");
      return res.json();
    })
    .then(teacher => {
      resultDiv.innerHTML = `
        <b>Name:</b> ${teacher.name} <br>
        <b>Status:</b> ${teacher.status} <br>
        <b>Location:</b> ${teacher.departmentDescription} <br>
        <b>Last Updated:</b> ${teacher.last_updated}
      `;

      // Remove previous search marker if exists
      if (searchMarker) {
        map.removeLayer(searchMarker);
        searchMarker = null;
      }

      if (userRole === 'user') {
        // Remove all other markers for student view
        clearAllMarkers();
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
      resultDiv.innerHTML = err.message;

      if (searchMarker) {
        map.removeLayer(searchMarker);
        searchMarker = null;
      }
    });
}

// Run on page load
window.addEventListener("DOMContentLoaded", () => {
  initMap();
  fetchTeachers();
  setInterval(fetchTeachers, 5000);
});
