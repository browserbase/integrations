"use client";

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Resume Builder</h1>
      <form className="space-y-4">
        <div>
          <label htmlFor="name" className="block">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            className="w-full border p-2"
            required
          />
        </div>
        <div>
          <label htmlFor="email" className="block">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            className="w-full border p-2"
            required
          />
        </div>
        <div>
          <label htmlFor="experience" className="block">
            Experience
          </label>
          <textarea
            id="experience"
            name="experience"
            className="w-full border p-2"
            required
          ></textarea>
        </div>
        <div>
          <label htmlFor="education" className="block">
            Education
          </label>
          <textarea
            id="education"
            name="education"
            className="w-full border p-2"
            required
          ></textarea>
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded"
        ></button>
      </form>
    </main>
  );
}
