const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3001; // <-- Make sure this line comes before using PORT

app.use(cors());
app.use(bodyParser.json());

const users = [
  { role: 'user', mobile: '9999999999', password: 'user123' },
  { role: 'admin', mobile: '8888888888', password: 'admin123' }
];

app.post('/login', (req, res) => {
  const { role, mobile, password } = req.body;
  const foundUser = users.find(u => u.role === role && u.mobile === mobile && u.password === password);
  if (foundUser) {
    res.json({ message: "Login successful" });
  } else {
    res.status(401).json({ message: "Invalid credentials" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


const schedules = require('./teacherSchedules');
const deptLocations = require('./departmentLocations');

let teacherLocations = [
    {
      id: 'T001',
      name: 'Dr. Sharma',
      location: [29.7542, 79.4274], // Starting near Applied Science
      status: 'Free',
      last_updated: new Date().toLocaleTimeString()
    },
    {
      id: 'T002',
      name: 'Prof. Meena',
      location: [29.7543, 79.4265], // Starting near Chemical
      status: 'Free',
      last_updated: new Date().toLocaleTimeString()
    },
    {
      id: 'T003',
      name: 'Dr. Verma',
      location: [29.7545, 79.4269], // Starting near Administration
      status: 'Free',
      last_updated: new Date().toLocaleTimeString()
    }
  ];
  

function updateTeacherStatus() {
  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
  const currentHour = now.getHours();

  teacherLocations = teacherLocations.map(t => {
    const teacherSchedule = schedules.find(s => s.id === t.id);
    let status = 'Free';

    if (teacherSchedule) {
      const matchedClass = teacherSchedule.schedule.find(s =>
        s.day === currentDay && s.hour === currentHour
      );

      if (matchedClass) {
        const expectedLocation = deptLocations[matchedClass.dept];
        const [lat1, lng1] = expectedLocation || [0, 0];
        const [lat2, lng2] = t.location;

        const isInClass = Math.abs(lat1 - lat2) < 0.0002 && Math.abs(lng1 - lng2) < 0.0002;

        status = isInClass ? 'In Class' : 'Absent';
      }
    }

    return {
      ...t,
      status,
      last_updated: new Date().toLocaleTimeString()
    };
  });
}
function simulateMovement() {
  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
  const currentHour = now.getHours();

  teacherLocations = teacherLocations.map(t => {
    const schedule = schedules.find(s => s.id === t.id);
    let targetLocation = null;

    if (schedule) {
      const matchedClass = schedule.schedule.find(s =>
        s.day === currentDay && s.hour === currentHour
      );

      if (matchedClass) {
        const deptLoc = deptLocations[matchedClass.dept];
        if (deptLoc) {
          targetLocation = deptLoc;
        }
      }
    }

    const [lat, lng] = t.location;
    let newLat = lat;
    let newLng = lng;

    if (targetLocation) {
      const [tLat, tLng] = targetLocation;

      const latStep = (tLat - lat) * 0.1;
      const lngStep = (tLng - lng) * 0.1;

      newLat += latStep;
      newLng += lngStep;
    } else {
      const randomOffset = () => (Math.random() - 0.5) * 0.00001;
      newLat += randomOffset();
      newLng += randomOffset();
    }

    return {
      ...t,
      location: [newLat, newLng]
    };
  });

  updateTeacherStatus();
}

setInterval(() => {
  simulateMovement();
  updateTeacherStatus();
}, 10000);

function getDepartmentDescription(location) {
  const [lat, lng] = location;
  const deptNames = Object.keys(deptLocations);

  for (const dept of deptNames) {
    const [dLat, dLng] = deptLocations[dept];

    const distance = Math.sqrt(Math.pow(dLat - lat, 2) + Math.pow(dLng - lng, 2));

    if (distance < 0.0002) {
      return `In the ${dept} department`;
    } else if (distance < 0.001) {
      return `Near the ${dept} department`;
    }
  }

  return "Location not near any known department";
}

app.get('/api/teachers', (req, res) => {
  res.json(teacherLocations);
});

app.get('/api/teachers/search', (req, res) => {
  const query = req.query.q?.toLowerCase();
  if (!query) {
    return res.status(400).json({ message: 'Missing search query' });
  }

  const matched = teacherLocations.find(t =>
    t.name.toLowerCase().includes(query)
  );

  if (matched) {
    const departmentDescription = getDepartmentDescription(matched.location);
    res.json({
      ...matched,
      departmentDescription
    });
  } else {
    res.status(404).json({ message: 'No matching teacher found' });
  }
});

app.post('/api/update-location', (req, res) => {
  const { id, location, status } = req.body;
  const teacher = teacherLocations.find(t => t.id === id);
  if (teacher) {
    teacher.location = location;
    teacher.status = status;
    teacher.last_updated = new Date().toLocaleTimeString();
  }
  res.json({ message: 'Location updated' });
});
