
import { HttpStatus } from "../constants/httpStatus.js";

export  const errorPage =(req,res)=>{
 try {
   res.status(HttpStatus.NOT_FOUND).render('notFound') 
 } catch (error) {
    console.log(error)
 }
}

