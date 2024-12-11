let express = require('express');
let app = express();
let path = require('path');
const session = require('express-session');
const port = process.env.PORT || 4001;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static('public'));

// Load environment variables
require('dotenv').config();

// Database connection
const knex = require('knex')({
    client: 'pg',
    connection: {
        host: process.env.RDS_HOSTNAME,
        user: process.env.RDS_USERNAME,
        password: process.env.RDS_PASSWORD,
        database: process.env.RDS_DB_NAME,
        port: process.env.RDS_PORT,
    }
});

module.exports = knex;

// Configure session middleware
app.use(
    session({
        secret: 'yourSecretKey', // Replace with a secure secret
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 60000 * 60 } // 1-hour session
    })
);

// Redirect root to landingPage
app.get('/', (req, res) => {
    res.redirect('/landingPage');
});

app.get('/edituser/:user_id', (req, res) => {
    const user = req.session.user;
    if (!user) {
        return res.status(401).send('Unauthorized: Please log in to access this page');
    }

    const user_id = req.session.user.user_id; // Get the user_id from the session user

    Promise.all([
        knex('skills')
            .select('*')
            .andWhere('skills.user_id', user_id)
            .join('type', 'type.type_id', '=', 'skills.type_id'),
        knex('users')
            .select('*')
            .where('users.user_id', user_id)
    ])
    .then(([skills, userData]) => {
        res.render('edituser', { skills, user: userData[0] });
    })
    .catch(error => {
        console.error('Error fetching data:', error);
        res.status(500).send('Internal Server Error');
    });
});

app.post('/edituser/:user_id', (req, res) => {
    const user_id = req.params.user_id;
    const {
        firstname,
        lastname,
        email,
        phone,
        username,
        password
    } = req.body;
    
    console.log('Received user_id:', user_id);
    console.log('Received body:', req.body);

    knex('users')
    .where('user_id', user_id)
    .update({
        'email': email,
        'firstname': firstname,
        'lastname': lastname,
        'phone': phone,
        'username': username,
        'password': password
    })
    .then(updated => {
        console.log('Rows updated:', updated);
        res.redirect('/profile');
    })
    .catch(error => {
        console.error('Update error:', error);
        res.status(500).send('Failed to update volunteer');
    });
});

app.post('/deleteuser/:user_id', (req, res) => {
    const user_id = req.params.user_id; // From URL parameter

    // Delete related skills first
    knex('skills')
        .where('user_id', user_id) // Ensure the user_id is matched
        .del()
        .then(() => {
            // Now delete the user from the users table
            return knex('users')
                .where('user_id', user_id)
                .del();
        })
        .then(() => {
            // Destroy the session after successful deletion
            req.session.destroy(err => {
                if (err) {
                    console.error('Error destroying session:', err);
                    return res.status(500).send('Error deleting user session');
                }
                // Redirect to the landing page after session destruction
                res.redirect('/landingpage');
            });
        })
        .catch(error => {
            console.error('Error deleting user:', error);
            res.status(500).send('Internal Server Error');
        });
});

// Login route (GET)
app.get('/login', (req, res) => {
    res.render('login', { title: 'Login' });
});

// Login route (POST)
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Query the database for the user
        const user = await knex('users')
        .select('*')
        .where({ username, password_hash: password })
        .first(); // Get the first match (or undefined if none)

        if (user) {
            // User found, set session
            req.session.user = user;
            res.redirect('/landingPage');
        } else {
            // Invalid credentials
            res.status(401).send('Invalid credentials');
        }
    } catch (err) {
        console.error('Error querying database:', err);
        res.status(500).send('Internal server error');
    }
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/landingPage');
    });
});

// Landing page with session info
// Landing page with session info
app.get('/landingPage', (req, res) => {
    const user = req.session.user || false; // Check if user is logged in

    Promise.all([
        knex('skills')
            .select('skills.*', 'users.firstname', 'users.lastname', 'users.phone') // Select skills + user info
            .leftJoin('users', 'skills.user_id', '=', 'users.user_id') // Join skills with users by user_id
            .where('skills.type_id', 2), // Skills with type_id 2 (requests)
        knex('skills')
            .select('skills.*', 'users.firstname', 'users.lastname', 'users.phone') // Select skills + user info
            .leftJoin('users', 'skills.user_id', '=', 'users.user_id') // Join skills with users by user_id
            .where('skills.type_id', 1), // Skills with type_id 1 (offers)
    ])
    .then(([requests, offers]) => {
        res.render('landingPage', { requests, offers, user }); // Pass both requests, offers, and user session to the template
    })
    .catch(error => {
        console.error('Error fetching data:', error);
        res.status(500).send('Internal Server Error');
    });
});


// Profile page with session info
app.get('/profile', (req, res) => {
    const user = req.session.user;
    if (!user) {
        return res.status(401).send('Unauthorized: Please log in to access this page');
    }

    const user_id = req.session.user.user_id; // Get the user_id from the session user

    Promise.all([
        knex('skills')
            .select('*')
            .andWhere('skills.user_id', user_id)
            .join('type', 'type.type_id', '=', 'skills.type_id'),
        knex('users')
            .select('*')
            .where('users.user_id', user_id)
    ])
    .then(([skills, userData]) => {
        res.render('profile', { skills, user: userData[0] });
    })
    .catch(error => {
        console.error('Error fetching data:', error);
        res.status(500).send('Internal Server Error');
    });
});

// Post creation page
app.get('/post', (req, res) => {
    const user = req.session.user;
    if (!user) {
        return res.status(401).send(`
    <div style="text-align: center; font-family: Arial, sans-serif; margin-top: 20px;">
        <p>Unauthorized: Please log in to access this page</p>
        <a href="/login" style="color: #007bff; text-decoration: none; font-weight: bold;">Go to Sign In</a>
    </div>
`);}

    knex('type')
        .select('type_id', 'type_name')
        .then(types => {
            res.render('post', { types });
        })
        .catch(error => {
            console.error('Error fetching types:', error);
            res.status(500).send('Internal Server Error');
        });
});

// Submit post
app.post('/submit-post', (req, res) => {
    const user = req.session.user;
    if (!user) {
        return res.status(401).send('Unauthorized: Please log in to post');
    }

    const { description, title, price, post_type_id } = req.body;
    const user_id = req.session.user.user_id; // Get the user_id from the session
    const created_at = new Date().toISOString().split('T')[0];
    const is_active = true;

    knex('skills')
        .insert({
            description: description.toUpperCase(),
            title: title.toUpperCase(),
            user_id,
            price,
            created_at,
            is_active,
            type_id: post_type_id
        })
        .then(() => {
            res.redirect('/landingPage');
        })
        .catch(error => {
            console.error('Error adding service:', error);
            res.status(500).send('Internal Server Error');
        });
});

// create route to delete posts from the user page 
app.post('/deleteService/:id', (req, res) => {
    let id = req.params.id;
    knex('skills').where('skill_id', id).del()
    .then(() => {
        res.redirect('/profile');
    })
    .catch(error => {
        console.error('Error deleting skill:', error);
        res.status(500).send('Internal Server Error')
    });
});


// create route to view/edit a service from the user profile 
app.get('/editService/:id', (req, res) => {
    let id = req.params.id; 
    knex('skills').where('skill_id', id).first().then(skill => {
        if (!skill) {
            return res.status(404).send('Skill not found');
        } else {
            // Query the skill type after fetching the specific skill
            knex('type')
                .select('type_id', 'type_name')
                .then(skillType => {
                    // Render the edit form and pass both skill and skills
                    res.render('editService', { skill, skillType });
                })
                .catch(error => {
                    console.error('Error fetching skill:', error);
                    res.status(500).send('Internal Server Error');
                });
        }
    }).catch(error => {
        console.error('Error fetching skill by ID:', error);
        res.status(500).send('Internal Server Error');
    });
});



app.post('/editService/:id', (req,res) => {
    const id = req.params.id;

    const title = req.body.title.toUpperCase();
    const post_type_id = parseInt(req.body.post_type_id);
    const description = req.body.description.toUpperCase();
    const price = req.body.price;

    knex('skills').where('skill_id', id).update({
            title: title,
            type_id: post_type_id,
            description: description,
            price: price
        })
        .then(() => {
            res.redirect('/profile');
        })
        .catch(error => {
            console.error('Error updating Pokémon:', error);
            res.status(500).send('Internal Server Error');
        });
});

app.get("/register", (req, res) => {
    res.render("register", { title: "Register" });
});

app.post('/register', async (req, res) => {
    const { firstname, lastname, username, password_hash, email, phone } = req.body;

    if (!firstname || !lastname || !username || !password_hash || !email) {
        return res.render('register', {
            success: false,
            error: 'All fields are required.',
            formData: req.body, // Pass form data back to the page
        });
    }

    try {
        // Insert user into the database
        await knex('users').insert({
            firstname,
            lastname,
            username,
            password_hash, // In production, hash the password
            email,
            phone,
        });
         
        res.redirect('/landingPage'); // Redirect to the dashboard or appropriate page after deletion
        

    } catch (error) {
        console.error('Error querying database:', error.message);

        // Check for duplicate email (PK constraint violation)
        const errorMessage = 'The email provided is already in use. Please use a different email.';

        // Pass the error message to the page
        return res.render('register', {
            success: false,
            error: errorMessage,
            formData: req.body, // Preserve form data
        });
    }
});

// Start server
app.listen(port, () => console.log('Listening on port', port));
