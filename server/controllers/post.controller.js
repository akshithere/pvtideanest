// check this likes etc thingies
// no media is getting stored here // workin ****************
// implement cloudinary uploads with multer *************
// use the authentication middlewares
// get all the api's up and working
// connect them with the frontend

require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const User = require("../models/user.model");
const Post = require("../models/post.model");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// multer.middleware should do its job, i am not using the multer-storage-cloudinary package here

const handleError = (res, statusCode, message, error) => {
    return res.status(statusCode).json({ error: { message }, details: error });
};

const userNotFound = (res) => {
    return handleError(res, 404, "User Not Found!!");
};

const postNotFound = (res) => {
    return handleError(res, 404, "Post Not Found!!");
};

// before doing the actual upload to the cloudinary server i want to see if the middleware actually propagate the image as it is supposed to do

const createPostController = async (req, res) => {
    const { userId, caption, description } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) return userNotFound(res);

        const newPost = new Post({
            user: userId,
            caption,
            description
        });
        await newPost.save();
        user.posts.push(newPost._id);
        await user.save();

        return res.status(201).json({ message: "New Post Created Successfully!!", post: newPost });
    } catch (error) {
        return handleError(res, 500, "Error in Creating Post", error);
    }
};



const createPostWithMediaController = async (req, res) => {
    const { userId, caption, description } = req.body;
    console.log("the req.file is: ", req.file)
    try {
        const user = await User.findById(userId);
        if (!user){
            fs.unlink();
            return userNotFound(res);
        }

        const result = await cloudinary.uploader.upload(req.file.path,{
            folder: 'ideanest',
            resource_type: 'auto'
        })

        console.log("cloudinary result is: ", result);

        const newPost = new Post({
            user: userId,
            caption,
            description,
            link: result.secure_url
        });
        
        await newPost.save();
        user.posts.push(newPost._id);
        await user.save();

        return res.status(201).json({ message: "New Post Created Successfully!!", post: newPost });
    } catch (error) {
        return handleError(res, 500, "Error in Creating Post", error);
    }
};


const getAllPostsController = async (req, res) => {
    const { limit = 10, skip = 0 } = req.query;

    
        const totalPosts = await Post.countDocuments();
        const allPosts = await Post.find()
            .populate('user')
            .sort({ createdAt: -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .exec();

        const totalPages = Math.ceil(totalPosts / limit);

        return res.status(200).json({
            totalPosts,
            totalPages,
            posts: allPosts
        });
    
};

const getAllPostsOfCoFounderController = async (req, res) => {
    const { limit = 10, skip = 0 } = req.query;
    
    try {
        const cofounderPosts = await Post.find({})
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .exec();

        return res.status(200).json({
            posts: cofounderPosts
        });
    } catch (error) {
        return handleError(res, 500, "Error in fetching posts", error);
    }
};

module.exports = getAllPostsOfCoFounderController;


const getAllPostsOfInvestorController = async (req, res) => {
    const { limit = 10, skip = 0 } = req.query;

    try {
        const totalPosts = await Post.countDocuments({ "user.typeOfUser": 'Investor' });
        const investorPosts = await Post.find({ "user.typeOfUser": 'Investor' })
            .populate('user')
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .exec();

        const totalPages = Math.ceil(totalPosts / limit);

        return res.status(200).json({
            totalPosts,
            totalPages,
            posts: investorPosts
        });
    } catch (error) {
        return handleError(res, 500, "Error in fetching investor posts", error);
    }
};

const deletePostController = async (req, res) => {
    try {
        const { postId } = req.params;
        const findPost = await Post.findById(postId);
        if (!findPost) return postNotFound(res);

        await Post.deleteOne({ _id: postId });
        return res.status(200).json({ message: "Post deleted successfully." });
    } catch (error) {
        return handleError(res, 500, "Error In deleting Post", error);
    }
};

// <<<<<<< main
// const getAllPostsController = async (req, res) => {
//     try {m
//         const allPosts = await Post.find();
//         if (allPosts.length === 0) {
//             return res.status(404).json("No Post Found");
//         }
//         return res.status(200).json(allPosts);
//     } catch (error) {
//         return handleError(res, 500, "Error In fetching all Posts", error);
//     }
// };
// =======

// >>>>>>> main

const getAllPostByIdController = async (req, res) => {
    try {
        const { userId } = req.params;
        const allPostsOfUser = await Post.find({ user: userId });
        if (allPostsOfUser.length === 0) {
            return res.status(404).json("No Posts are Created");
        }
        return res.status(200).json(allPostsOfUser);
    } catch (error) {
        return handleError(res, 500, "Error In fetching all Posts of User", error);
    }
};

const likePostController = async (req, res) => {
    const { postId } = req.params;
    const { userId } = req.body;
    try {
        const post = await Post.findById(postId);
        if (!post) return postNotFound(res);

        const user = await User.findById(userId);
        if (!user) return userNotFound(res);

        if (post.likes.includes(userId)) {
            return res.status(400).json({ message: "You already liked This Post" });
        }
        post.likes.push(userId);
        await post.save();
        return res.status(200).json({ message: "You liked the post", post });
    } catch (error) {
        return handleError(res, 500, "Internal Server Error", error);
    }
};

module.exports = {
    createPostController,
    createPostWithMediaController,
    getAllPostsOfCoFounderController,
    getAllPostsOfInvestorController,
    deletePostController,
    getAllPostsController,
    getAllPostByIdController,
    likePostController
};
