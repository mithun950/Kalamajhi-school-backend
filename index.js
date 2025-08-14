const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');


const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

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

let db, userCollection, noticeCollection,teacherCollection,marqueeCollection,testimonialCollection;

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
