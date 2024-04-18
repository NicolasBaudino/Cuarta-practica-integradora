import { Router } from 'express';
import userModel from '../models/user.model.js';
import passport from 'passport';
import { isValidPas, createHash, generateJWToken, transporter, authToken, PRIVATE_KEY, uploader } from '../utils.js';
import { v4 as uuidv4 } from "uuid";
import config from '../config/config.js';
import { emailService, userService } from '../services/service.js';
import jwt from 'jsonwebtoken';

const router = Router();

router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        if (email === "adminCoder@coder.com" && password === "adminCod3r123") {
            const tokenAdmin = {
              first_name: "Admin",
              last_name: "N/A",
              email: "N/A",
              role: "admin",
              registerWith: "App",
            };
      
            const access_token = generateJWToken(tokenAdmin);
            console.log("Admin token: " + access_token);
            res.cookie('jwtCookieToken', access_token,
                {
                    maxAge: 600000,
                    httpOnly: true
                }
            )
      
            return res.status(200).json({
              success: "success",
              data: "admin",
            });
        }
        else {
            const account = await userService.getAccountByEmail(email);
            if (!account) {
              throw new Error("Invalid credentials");
            }
        
            const verifyPassword = await isValidPas(account.password, password);
        
            if (!verifyPassword) {
              throw new Error("Invalid credentials");
            }
            const tokenUser = {
                _id: account._id,
                first_name: account.first_name,
                last_name: account.last_name,
                email: account.email,
                age: account.age,
                role: account.role
            };
            const access_token = generateJWToken(tokenUser);
            console.log("User token: " + access_token);

            res.cookie('jwtCookieToken', access_token,
                {
                    maxAge: 60000,
                    httpOnly: true
                }
            )

            account.last_connection = Date.now();
            account.save();
        }
        
        res.send({ success: "success", message: "Login success" })
    } catch (error) {
        console.error(error);
        return res.status(500).send({ success: "error", status: "error", error: "Invalid credentials" });
    }

});

router.post('/register', passport.authenticate('register', { session: false }), uploader.single('avatar'), async (req, res) => {
  try {
    
      const file = req.file;
      const user = req.user;
      console.log("REQ: ", req)
      console.log("BODY: ", req.body)
      console.log("FILE: ", req.file);
      console.log("FILES: ", req.files)
      if (!user) {
          return res.status(404).send("User not found");
      }

      // if (!req.file){
      //     return res.status(400).send({ status: "error", message: "No file attached"})
      // }

      const avatar = {
          name: file.filename, 
          reference: file.path
      };

      user.avatar = avatar;

      await user.save();
      console.log("Registering user");
      res.status(200).send({ status: "success", message: "User created", data: req.user });
  }
  catch (error) {
      console.error("Error at adding a file: ", error);
      res.status(500).send("Internal server error");
  }
});

router.post("/recover-password", async(req, res) => {
    try {
        const { email } = req.body;
        console.log(email);
        if (!email) {
          return res.status(400).send("Email not privided");
        }

        const token = uuidv4();
        const link = `http://localhost:8080/users/new-password/${token}`;
        
        const now = new Date();
        const oneHourMore = 60 * 60 * 1000;
    
        now.setTime(now.getTime() + oneHourMore);
    
        console.log(now);
    
        const tempDbMails = {
          email,
          tokenId: token,
          expirationTime: new Date(Date.now() + 60 * 60 * 1000),
        };
    
        console.log(tempDbMails);
    
        try {
          const created = await emailService.createEmail(tempDbMails);
          console.log(created);
        } catch (err) {
          console.log(err);
        }
        
        let mailOptions = {
            from: 'tu-correo@gmail.com',
            to: email,
            subject: 'Correo de prueba',
            text: `To reset your password, click on the following link: ${link}`
        };
    
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            res.status(500).send({ message: "Error", payload: error });
          }
          res.send({ success: true, payload: info });
        });
    } 
    catch (error) {
        res.status(500).send({
          success: false,
          error: "No se pudo enviar el email desde:" + config.userMail,
        });
    }
})

router.post("/new-password/:token", async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
    
    const bycriptPassword = createHash(password);

    const findUser = await emailService.getEmail(token);

    const now = new Date();
    const expirationTime = findUser.expirationTime;

    if (now > expirationTime || !expirationTime) {
        await emailService.deleteToken(token);
        return res.redirect("/users/send-email-to-reset");
    }
    try {
        const account = await userService.getAccountByEmail(findUser.email);
        console.log("account: ", account)
        if (!account) {
            throw new Error("Invalid credentials");
        }

        const isSamePassword = await isValidPas(account.password, password);

        if (isSamePassword) {
            throw new Error("This is your current password. Please try another one.");
        }

        const passwordChange = await userService.updatePassword(findUser.email, bycriptPassword);

        console.log(passwordChange);

        res.status(200).send({ success: true, error: null });
    } catch (err) {
        res.status(400).send({
        success: false,
        error: err.message,
        });
    }
})

router.get("/logout", async (req, res) => {
  const token = req.cookies.jwtCookieToken;
  if (!token) {
    return res.status(401).send({ error: "User not authenticated or missing token." });
  }

  jwt.verify(token, PRIVATE_KEY, async (error, credentials) => {
    if (error) return res.status(403).send({ error: "Token invalid, Unauthorized!" });
    const user = await userModel.findById(credentials.user._id);
    if (!user) {
      return res.status(404).send({ error: "User not found." });
    }

    user.last_connection = Date.now();
    await user.save();

    res.clearCookie("jwtCookieToken");
    res.status(200).json({
      success: true,
      data: "Logged out",
    });
  });
});

export default router;