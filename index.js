const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const PDFDocument = require("pdfkit");
// const multer = require("multer");
// const fs = require("fs");
// const path = require("path");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json({ limit: "10mb" })); 





// MongoDB URI
const uri = process.env.MONGO_URI;

// MongoClient তৈরি
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



let db, userCollection, noticeCollection,teacherCollection,marqueeCollection,
testimonialCollection,opinionCollection,routineCollection,admissionCollection,
statusCollection,studentsCollection, resultsCollection, finalsCollection,galleryCollection;

async function run() {
  try {
    await client.connect();
    console.log('MongoDB connected successfully');

    db = client.db('kalamajhiSchoolDB');  
    userCollection = db.collection('users');//user er jonno
     noticeCollection = db.collection('notices'); //notice er jonno
     teacherCollection = db.collection('teachers'); // teachers collection
     marqueeCollection = db.collection('marquees'); // marquees collection
     testimonialCollection = db.collection('testimonials'); // testimonial collection
     opinionCollection = db.collection('opinions'); // opinions collection
        routineCollection = db.collection('routines');//class routine collection
      // periodCollection = db.collection("periods");
       admissionCollection = db.collection('admissions');
    statusCollection = db.collection('status');
     resultsCollection = db.collection("results");
     studentsCollection = db.collection("students");
     finalsCollection = db.collection("finals");
     galleryCollection = db.collection("gallery");
     
     
     // jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    })

     // middlewares 
    const verifyToken = (req, res, next) => {
      console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }

    // Home route
    app.get('/', (req, res) => {
      res.send('Express + MongoDB User API is running');
    });

    app.patch('/api/users/admin/:id',async(req,res) =>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
     const updatedDoc = {
      $set: {
        role:"admin"
      }
     }
     const result = await userCollection.updateOne(filter,updatedDoc)
     res.send(result);
    })
     app.delete('/api/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })
    // GET all users
    app.get('/api/users', verifyToken, async (req, res) => {
      console.log('high')
      try {
        
        const users = await userCollection.find({}).toArray();
        res.status(200).json(users);
      } catch (error) {
        res.status(500).json({ message: 'Failed to fetch users', error });
      }
    });

     app.get('/api/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })

    // POST new user
    app.post('/api/users', async (req, res) => {
  const newUser = req.body; // { name, email }
  const query = {email: newUser.email}
  const existingUser = await userCollection.findOne(query);
  if(existingUser){
    return res.send({message: 'user already exists', insertedId: null})
  }
  try {
    const result = await userCollection.insertOne(newUser);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to add user', error });
  }
});

 // GET all notices
    app.get('/api/notices', async (req, res) => {
      try {
        const notices = await noticeCollection.find({}).sort({ date: -1 }).toArray();
        res.status(200).json(notices);
      } catch (error) {
        res.status(500).json({ message: 'Failed to fetch notices', error });
      }
    });

    // POST new notice (optional, for admin usage)
    app.post('/api/notices', async (req, res) => {
      const newNotice = req.body; // { title, description, date }
      try {
        const result = await noticeCollection.insertOne(newNotice);
        res.status(201).json(result);
      } catch (error) {
        res.status(500).json({ message: 'Failed to add notice', error });
      }
    });

   



// UPDATE notice by id
app.put('/api/notices/:id', async (req, res) => {
  const id = req.params.id;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid notice ID" });
  }

  const { _id, ...updateFields } = req.body; // _id বাদ দিলাম

  try {
    const result = await noticeCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Notice not found" });
    }
    res.json({ message: "Notice updated successfully" });
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ message: "Failed to update notice", error });
  }
});

// DELETE notice by id
app.delete('/api/notices/:id', async (req, res) => {
  const id = req.params.id;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid notice ID" });
  }

  try {
    const result = await noticeCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Notice not found" });
    }
    res.json({ message: "Notice deleted successfully" });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ message: "Failed to delete notice", error });
  }
});

// GET marque
    app.get('/api/marquees', async (req, res) => {
      try {
        const marquees = await marqueeCollection.find({}).sort({ date: -1 }).toArray();
        res.status(200).json(marquees);
      } catch (error) {
        res.status(500).json({ message: 'Failed to fetch notices', error });
      }
    });

    // POST new marque
    app.post('/api/marquees', async (req, res) => {
      const newMarquee = req.body; // { title, description, date }
      try {
        const result = await marqueeCollection.insertOne(newMarquee);
        res.status(201).json(result);
      } catch (error) {
        res.status(500).json({ message: 'Failed to add notice', error });
      }
    });

   



// UPDATE marquee by id
app.put('/api/marquees/:id', async (req, res) => {
  const id = req.params.id;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid notice ID" });
  }

  const { _id, ...updateFields } = req.body; // _id বাদ দিলাম

  try {
    const result = await marqueeCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Notice not found" });
    }
    res.json({ message: "Notice updated successfully" });
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ message: "Failed to update notice", error });
  }
});

// DELETE marquee by id
app.delete('/api/marquees/:id', async (req, res) => {
  const id = req.params.id;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid notice ID" });
  }

  try {
    const result = await marqueeCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Notice not found" });
    }
    res.json({ message: "Notice deleted successfully" });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ message: "Failed to delete notice", error });
  }
});

// GET testimonials
app.get('/api/testimonials', async (req, res) => {
  try {
    const testimonials = await testimonialCollection.find({}).sort({ date: -1 }).toArray();
    res.status(200).json(testimonials);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch testimonials', error });
  }
});

// POST new testimonial
app.post('/api/testimonials', async (req, res) => {
  const newTestimonial = req.body; // { name, image, achievement, description, date }
  try {
    const result = await testimonialCollection.insertOne(newTestimonial);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to add testimonial', error });
  }
});

// UPDATE testimonial by id
app.put('/api/testimonials/:id', async (req, res) => {
  const id = req.params.id;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid testimonial ID" });
  }

  const { _id, ...updateFields } = req.body;

  try {
    const result = await testimonialCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Testimonial not found" });
    }
    res.json({ message: "Testimonial updated successfully" });
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ message: "Failed to update testimonial", error });
  }
});

// DELETE testimonial by id
app.delete('/api/testimonials/:id', async (req, res) => {
  const id = req.params.id;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid testimonial ID" });
  }

  try {
    const result = await testimonialCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Testimonial not found" });
    }
    res.json({ message: "Testimonial deleted successfully" });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ message: "Failed to delete testimonial", error });
  }
});


    // GET all teachers
app.get('/api/teachers', async (req, res) => {
  try {
    const teachers = await teacherCollection.find({}).toArray();
    res.status(200).json(teachers);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch teachers', error });
  }
});

// POST new teacher
app.post('/api/teachers', async (req, res) => {
  const newTeacher = req.body; // { name, image, subject, phone }
  if (!newTeacher.name || !newTeacher.image || !newTeacher.subject || !newTeacher.phone) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  try {
    const result = await teacherCollection.insertOne(newTeacher);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to add teacher', error });
  }
});

// UPDATE teacher by id
app.put('/api/teachers/:id', async (req, res) => {
  const id = req.params.id;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid teacher ID' });
  }

  const updatedTeacher = req.body;
  try {
    const result = await teacherCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedTeacher }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    res.status(200).json({ message: 'Teacher updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update teacher', error: error.message });
  }
});

// DELETE teacher by id
app.delete('/api/teachers/:id', async (req, res) => {
  const id = req.params.id;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid teacher ID' });
  }

  try {
    const result = await teacherCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    res.status(200).json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete teacher', error: error.message });
  }
});



// GET opinions
app.get('/api/opinions', async (req, res) => {
  try {
    const opinions = await opinionCollection.find({}).sort({ date: -1 }).toArray();
    res.status(200).json(opinions);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch opinions', error });
  }
});

// POST new opinion
app.post('/api/opinions', async (req, res) => {
  const newOpinion = req.body; // { name, image, shortDesc, fullDesc, date }
  try {
    const result = await opinionCollection.insertOne(newOpinion);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to add opinion', error });
  }
});

// UPDATE opinion by id
app.put('/api/opinions/:id', async (req, res) => {
  const id = req.params.id;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid opinion ID" });
  }

  const { _id, ...updateFields } = req.body;

  try {
    const result = await opinionCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Opinion not found" });
    }
    res.json({ message: "Opinion updated successfully" });
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ message: "Failed to update opinion", error });
  }
});

// DELETE opinion by id
app.delete('/api/opinions/:id', async (req, res) => {
  const id = req.params.id;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid opinion ID" });
  }

  try {
    const result = await opinionCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Opinion not found" });
    }
    res.json({ message: "Opinion deleted successfully" });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ message: "Failed to delete opinion", error });
  }
});


  // ================== Class Routine APIs ==================
app.get("/routines/:className/:section", async (req, res) => {
  const { className, section } = req.params;
  const routines = await routineCollection.find({ class: className, section }).toArray();
  res.send(routines);
});

// Add routine
app.post("/routines", async (req, res) => {
  const routine = req.body;
  const result = await routineCollection.insertOne(routine);
  res.send(result);
});

// Update routine
app.put("/routines/:id", async (req, res) => {
  const id = req.params.id;
  const routine = req.body;
  const result = await routineCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: routine }
  );
  res.send(result);
});

// Delete routine
app.delete("/routines/:id", async (req, res) => {
  const id = req.params.id;
  const result = await routineCollection.deleteOne({ _id: new ObjectId(id) });
  res.send(result);
});



// GET all admissions
app.get("/api/admissions", async (req, res) => {
  try {
    const admissions = await admissionCollection.find({}).sort({ date: -1 }).toArray();
    res.status(200).json(admissions);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch admissions", error });
  }
});

// GET admission status (open/close)
app.get("/api/admission-status", async (req, res) => {
  try {
    const status = await statusCollection.findOne({});
    res.status(200).json({ isOpen: status ? status.isOpen : true });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch admission status", error });
  }
});

// POST new admission
app.post("/api/admissions", async (req, res) => {
  try {
    const newAdmission = { ...req.body, status: "pending", date: new Date() };
    const result = await admissionCollection.insertOne(newAdmission);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to submit admission", error });
  }
});

// UPDATE admission (confirm)
app.put("/api/admissions/confirm/:id", async (req, res) => {
  const id = req.params.id;
  if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid ID" });
  try {
    const result = await admissionCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: "done" } }
    );
    res.json({ message: "Admission confirmed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to confirm admission", error });
  }
});

// DELETE admission
app.delete("/api/admissions/:id", async (req, res) => {
  const id = req.params.id;
  if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid ID" });
  try {
    const result = await admissionCollection.deleteOne({ _id: new ObjectId(id) });
    res.json({ message: "Admission deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete admission", error });
  }
});

// UPDATE admission status (open/close)
app.put("/api/admission-status", async (req, res) => {
  const { isOpen } = req.body;
  try {
    await statusCollection.updateOne({}, { $set: { isOpen } }, { upsert: true });
    res.json({ message: "Admission status updated", isOpen });
  } catch (error) {
    res.status(500).json({ message: "Failed to update admission status", error });
  }
});

 // ---------- Results API (add into your server run() where collections exist) ----------


// Add Student
app.post("/api/students", async (req, res) => {
  try {
    const { name, className, roll, section } = req.body;
    if (!name || !className || roll == null || !section)
      return res.status(400).json({ error: "Missing fields" });

    const exists = await studentsCollection.findOne({ className, roll: Number(roll) });
    if (exists) return res.status(400).json({ error: "Student with same class & roll exists" });

    const r = await studentsCollection.insertOne({ name, className, roll: Number(roll), section });
    res.status(201).json({ ok: true, insertedId: r.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all students
app.get("/api/students",  async (req, res) => {
  try {
    const list = await studentsCollection.find().toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get class-wise students
app.get("/api/students/class/:className",  async (req, res) => {
  try {
    const list = await studentsCollection
      .find({ className: req.params.className })
      .toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update student
app.put("/api/students/:id", async (req, res) => {
  try {
    const { name, className, roll, section } = req.body;
    const r = await studentsCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { name, className, roll: Number(roll), section } }
    );
    res.json({ ok: true, modifiedCount: r.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete student
app.delete("/api/students/:id", async (req, res) => {
  try {
    const r = await studentsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ ok: true, deletedCount: r.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload result
app.post("/api/results", async (req, res) => {
  try {
    const { studentId, className, roll, section, type, subjects } = req.body;
    // type = 'half' or 'yearly'
    const r = await resultsCollection.updateOne(
      { studentId, type },
      { $set: { studentId, className, roll, section, type, subjects } },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get result by studentId
app.get("/api/results/:studentId", async (req, res) => {
  try {
    const results = await resultsCollection.find({ studentId: req.params.studentId }).toArray();

    // Calculate final result automatically
    let half = results.find(r => r.type === "half");
    let yearly = results.find(r => r.type === "yearly");

    let finalResult = {};
    if (half && yearly) {
      finalResult.subjects = {};
      finalResult.totalMarks = 0;
      finalResult.totalSubjects = Object.keys(yearly.subjects).length;
      let failSubjects = 0;

      for (let subject in yearly.subjects) {
        const halfMark = half.subjects[subject] || 0;
        const yearMark = yearly.subjects[subject] || 0;
        const finalMark = halfMark * 0.4 + yearMark * 0.6;
        finalResult.subjects[subject] = finalMark;
        finalResult.totalMarks += finalMark;
        if (finalMark < 33) failSubjects++;
      }
      finalResult.failSubjects = failSubjects;
    }

    res.json({ half, yearly, finalResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// app.get("/api/results/pdf/:studentId", async (req, res) => {
//   try {
//     const studentId = req.params.studentId;
//     const student = await studentsCollection.findOne({ _id: new ObjectId(studentId) });
//     const result = await resultsCollection.findOne({ studentId });

//     if (!student || !result) {
//       return res.status(404).json({ error: "Student or result not found" });
//     }

//     const doc = new PDFDocument({ margin: 50 });
//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename=${student.name}_Result.pdf`
//     );
//     res.setHeader("Content-Type", "application/pdf");
//     doc.pipe(res);

//     // 🏫 Header
//     doc.fontSize(22).text("🏫 School Result Sheet", { align: "center", underline: true });
//     doc.moveDown(1);

//     // Student Info
//     doc.fontSize(14)
//       .text(`Name: ${student.name}`)
//       .text(`Class: ${student.className}`)
//       .text(`Roll: ${student.roll}`)
//       .moveDown(1);

//     // Function to draw each exam table
//     const drawExamTable = (title, examData) => {
//       if (!examData) return;

//       doc.fontSize(16).fillColor("#1E3A8A").text(title, { underline: true });
//       doc.moveDown(0.5);

//       // Table Header
//       doc.fontSize(13).fillColor("black");
//       doc.text("Subject", 70, doc.y, { continued: true });
//       doc.text("Marks", 300);
//       doc.moveTo(60, doc.y - 5).lineTo(520, doc.y - 5).stroke();

//       // Subjects & Marks
//       Object.entries(examData.subjects).forEach(([sub, mark]) => {
//         doc.text(sub, 70, doc.y + 5, { continued: true });
//         doc.text(`${mark}`, 300);
//       });

//       // Total Marks
//       const totalMarks = Object.values(examData.subjects).reduce(
//         (sum, val) => sum + Number(val || 0),
//         0
//       );
//       doc.moveDown(1);
//       doc.fontSize(13).text(`Total Marks: ${totalMarks}`, { align: "right" });

//       // Fail Subjects
//       if (examData.failSubjects && examData.failSubjects.length > 0) {
//         doc.fontSize(12).fillColor("red").text(
//           `Failed Subjects: ${examData.failSubjects.join(", ")}`,
//           { align: "right" }
//         );
//       }

//       doc.moveDown(1);
//       doc.fillColor("black");
//     };

//     // Half Yearly
//     drawExamTable("Half Yearly Exam", result.half);
//     // Yearly
//     drawExamTable("Yearly Exam", result.yearly);

//     // Signatures
//     doc.moveDown(2);
//     doc.fontSize(12)
//       .text("__________________________", 70)
//       .text("Teacher’s Signature", 80)
//       .text("__________________________", 350)
//       .text("Principal’s Signature", 370);

//     doc.end();
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// --- Get all gallery items ---
app.get("/api/gallery", async (req, res) => {
  try {
    const items = await galleryCollection.find().sort({ createdAt: -1 }).toArray();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Add new gallery item ---
app.post("/api/gallery", async (req, res) => {
  try {
    const { title, imageUrl } = req.body;

    if (!title || !imageUrl) {
      return res.status(400).json({ error: "Title and imageUrl are required" });
    }

    const newItem = { title, image: imageUrl, createdAt: new Date() };
    const result = await galleryCollection.insertOne(newItem);

    res.status(201).json({ _id: result.insertedId, ...newItem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Update gallery item ---
app.put("/api/gallery/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, imageUrl } = req.body;

    await galleryCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { title, image: imageUrl, updatedAt: new Date() } }
    );

    res.json({ message: "Updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Delete gallery item ---
app.delete("/api/gallery/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await galleryCollection.deleteOne({ _id: new ObjectId(id) });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
    // সার্ভার চালু করো
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run().catch(console.dir);
