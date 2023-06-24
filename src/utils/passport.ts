// import passport from "passport"
// const dotenv = require("dotenv");
// const User = require("../models/User");
// const { google } = require("googleapis");
// dotenv.config();

// let GoogleStrategy = require("passport-google-oauth20").Strategy;

// passport.use(
//   new GoogleStrategy(
//     {
//       clientID:
//         "879901166374-k90qctgojed4j8ohifoni9f20obmhsgl.apps.googleusercontent.com",
//       clientSecret: "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",
//       callbackURL: "/auth/google/callback",
//       scope: [
//         "https://www.googleapis.com/auth/userinfo.profile",
//         "https://www.googleapis.com/auth/userinfo.email",
//         "https://www.googleapis.com/auth/user.birthday.read",
//       ],
//     },
//     async (accessToken, refreshToken, profile, done) => {
//       // Lấy thông tin ngày sinh
//       const oauth2Client = new google.auth.OAuth2();
//       oauth2Client.setCredentials({ access_token: accessToken });
//       const people = google.people({ version: "v1", auth: oauth2Client });

//       let birthday;
//       try {
//         const result = await people.people.get({
//           resourceName: "people/me",
//           personFields: "birthdays",
//         });
//         birthday = (await result.data.birthdays)
//           ? result.data.birthdays[0].date
//           : null;
//         profile.birthday = birthday || "hello";
//       } catch (error) {
//         console.log(error);
//       }

//       console.log("data :>> ", profile);
//       const newUser = {
//         googleId: profile._json.sub,
//         displayName: profile._json.name,
//         firstName: profile._json.given_name,
//         lastName: profile._json.family_name,
//         image: profile._json.picture,
//       };

//       try {
//         let user = await User.findOne({ googleId: profile._json.sub });
//         if (user) {
//           done(null, user);
//         } else {
//           user = await User.create(newUser);
//           done(null, user);
//         }
//       } catch (err) {
//         console.error(err);
//       }
//     }
//   )
// );

// passport.serializeUser((user, done) => {
//   // goi serializeUser no se set   req.user = user
//   done(null, user.id); // ghi user.id vao session (luu voa mongodb)
// }),
//   passport.deserializeUser(async (id, done) => {
//     // User.findById(id, (err, user) => done(err, user));
//     // try {
//     //   const user = await User.findById(id);
//     //   console.log("ussfaser :>> ", user);
//     //   done(null, user); // => goi deserializeUser no se set req.user = user
//     // } catch (error) {
//     //   done(error, null);
//     //   console.log("findbyid: >>>>> ", error);
//     // }
//     done(null, id);
//   });
