git checkout master && \
git branch -D gh-pages && \
git checkout -b gh-pages && \
git reset && \
git commit -m "init"
# git push origin -d gh-pages && \
git ls-files && echo '=================================' && \
cd dist && git add . && git commit -m "dist folder to deploy" && \
git status && \
it ls-files && \
cd .. && git stash

# git subtree push --prefix dist origin gh-pages
