
export  const errorPage =(req,res)=>{
 try {
   res.status(404).render('notFound') 
 } catch (error) {
    console.log(error)
 }
}

