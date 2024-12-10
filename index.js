let express = require('express');
let app = express();
let path = require('path');
const session = require('express-session');
const port = 4000;

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
        port: process.env.RDS_PORT
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
app.get('/landingPage', (req, res) => {
    const user = req.session.user || false; // Check if user is logged in
    Promise.all([
        knex('skills')
            .select('*')
            .where('skills.type_id', 2)
            .join('type', 'type.type_id', '=', 'skills.type_id'), // Skills with type_id 2
        knex('skills')
            .select('*')
            .where('skills.type_id', 1)
            .join('type', 'type.type_id', '=', 'skills.type_id') // Skills with type_id 1
    ])
    .then(([requests, offers]) => {
        res.render('landingPage', { requests, offers, user }); // Pass both results and user session to the template
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

    const user_id = 1; // Replace with dynamic user_id based on the session user

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
        return res.status(401).send('Unauthorized: Please log in to access this page');
    }

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
    const user_id = 1; // Replace with the actual user_id from session
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






// create route to view/edit a service from the user profile 
app.get('/editService/:id', (req, res) => {
    let id = req.params.id; 
    knex('skills').where('skill_id', id).first().then(skill => {
        if (!skill) {
            return res.status(404).send('Skill not found');
        } else {
            // Query all skills after fetching the specific skill
            knex('skills')
                .select('id', 'description')
                .then(skills => {
                    // Render the edit form and pass both skill and skills
                    res.render('editService', { skill, skills });
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


app.get('/editCharacter/:id', (req,res) => {
    // Query the character by ID first
    knex.select('id', 
        'first_name',
        'last_name', 
        'planet_name', 
        'jedi', 
        'weapon')
        .from('characters').where('id', parseInt(req.params.id, 10)).first().then(starwars => {
            if (!starwars) {
                return res.status(404).send('Character not found');
              }
              knex('planets').select('id', 'planet_name').then(planetNames => {
                // Render the edit form and pass both pokemon and poke_types
                res.render('editCharacter', { starwars, planetNames });
        }).catch(err => {
    console.log(err);
    res.status(500).json({err});
        });
})
}); 

app.post('/editService/:id', (req,res) => {
    const id = req.params.id;

    const title = req.body.title;
    const post_type_id = parseInt(req.body.post_type_id);
    const description = req.body.description;
    const price = req.body.price;

    knex('skills').where('id', id).update({
            title: title,
            post_type_id: post_type_id,
            description: description,
            price: price
        })
        .then(() => {
            res.redirect('/');
        })
        .catch(error => {
            console.error('Error updating Pokémon:', error);
            res.status(500).send('Internal Server Error');
        });
});

// Start server
app.listen(port, () => console.log('Listening on port', port));
