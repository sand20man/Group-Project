let express = require('express');

let app = express();

let path = require('path');

const port = 3000;

app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({extended: true}));

app.use('/public', express.static('public'));

const knex = require('knex') ({
    client : 'pg',
    connection: {
        host: 'localhost',
        user: 'postgres',
        password: 'is403',
        database: 'groupproject',
        port: 5432
    }
})

const users = {
    user1: 'password1',
    user2: 'password2'
};

app.get('/', (req, res) => {
    res.render('login');
});

// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (users[username] && users[username] === password) {
        res.redirect('/landingPage');
    } else {
        res.send('Invalid credentials');
    }
});

app.get('/landingPage', (req, res) => {
    res.render('landingPage', {
        title: 'Landing Page'
    });
});

app.get('/profile', (req, res) => {
    res.render('profile', {
        title: 'profile'
    });
});

app.get('/post', (req, res) => {
    res.render('post', {
        title: 'post'
    });
});

app.post('/submit-post', (req,res) => {

});

app.post('/addPoke', (req, res) => {
    // Extract form values from req.body
    const description = req.body.description || ''; // Default to empty string if not provided
    const base_total = parseInt(req.body.base_total, 10); // Convert to integer
    const date_created = req.body.date_created || new Date().toISOString().split('T')[0]; // Default to today
    const active_poke = req.body.active_poke === 'true'; // Checkbox returns true or undefined
    const gender = req.body.gender || 'U'; // Default to 'U' for Unknown
    const poke_type_id = parseInt(req.body.poke_type_id, 10); // Convert to integer

    // Insert the new Pokémon into the database
    knex('pokemon')
        .insert({
            description: description.toUpperCase(), // Ensure description is uppercase
            base_total: base_total,
            date_created: date_created,
            active_poke: active_poke,
            gender: gender,
            poke_type_id: poke_type_id,
        })
        .then(() => {
            res.redirect('/'); // Redirect to the Pokémon list page after adding
        })
        .catch(error => {
            console.error('Error adding Pokémon:', error);
            res.status(500).send('Internal Server Error');
        });
});

app.listen(port, () => console.log('Listening on port', port));